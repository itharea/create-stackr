import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import chalk from 'chalk';
import boxen from 'boxen';
import YAML from 'yaml';
import { createHash } from 'crypto';
import { execa } from 'execa';
import { requireProjectRoot } from '../utils/project-root.js';
import {
  loadStackrConfig,
  saveStackrConfig,
  InvalidStackrConfigError,
  UnsupportedConfigVersionError,
} from '../utils/config-file.js';
import type {
  PendingMigration,
  ServiceEntry,
  StackrConfigFile,
} from '../types/config-file.js';
import type { InitConfig, ServiceConfig } from '../types/index.js';
import { coreEntry, noIntegrations } from '../config/presets.js';
import {
  buildServiceContext,
  stackrConfigToInitConfig,
} from '../generators/service-context.js';
import { ServiceGenerator } from '../generators/service.js';
import { renderComposeInnerBlocks } from '../generators/docker-compose.js';
import { writeEnvFilesWithCredentials } from '../generators/env-files.js';
import {
  generateServiceCredentials,
  type ServiceCredentials,
} from '../utils/credentials.js';
import {
  readMarkedBlock,
  writeMarkedBlock,
  initComposeWithMarkedBlocks,
  MarkerCorruptionError,
  MarkerNotFoundError,
} from '../utils/compose-merge.js';
import { allocateBackendPort, allocateWebPort, PortCollisionError } from '../utils/port-allocator.js';
import { validateServiceName, validateConfiguration } from '../utils/validation.js';
import { renderTemplate } from '../utils/template.js';
import { readStackrVersion } from '../utils/version.js';
import semver from 'semver';

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AddServiceOptions {
  authMiddleware?: 'standard' | 'role-gated' | 'flexible' | 'none';
  web?: boolean;
  mobile?: boolean;
  eventQueue?: boolean;
  port?: number;
  install?: boolean;
  force?: boolean;
  verbose?: boolean;
}

/**
 * `stackr add service <name>` — scaffold a new microservice inside an
 * already-generated project.
 *
 * Strictly follows the five-phase (A–E) ordering documented in
 * `plans/meta_phases.md` §7 and `plans/phase3_add_service_command.md`:
 *
 *   A. read-only planning       (no disk mutations)
 *   B. stage all writes in a temp dir
 *   C. dry-run validation       (still no disk mutations)
 *   D. commit in one sweep      (rename + writes + saveStackrConfig LAST)
 *   E. side effects             (package install, next-steps print)
 *
 * If any phase A–C step fails, the stagingDir is cleaned up and the
 * project root is left byte-identical to its pre-run state. Phase D is
 * ordered so that if a crash lands mid-commit, the config is the last
 * thing written, matching the "config is the reliable indicator of
 * partial completion" invariant.
 */
export async function runAddService(
  name: string,
  options: AddServiceOptions
): Promise<void> {
  const verbose = Boolean(options.verbose);
  const install = options.install !== false;

  // =========================================================================
  // Phase A — read-only planning
  // =========================================================================

  const root = await requireProjectRoot(process.cwd());
  verboseLog(verbose, `Project root: ${root}`);

  const config = await loadStackrConfig(root);

  assertVersionCompatibility(config);

  if (!options.force && (config.pendingMigrations?.length ?? 0) > 0) {
    throw buildPendingMigrationRefusal(config.pendingMigrations!);
  }

  // Name + basic shape validation before any expensive work
  const nameValidation = validateServiceName(name);
  if (!nameValidation.valid) {
    throw new Error(`Invalid service name "${name}": ${nameValidation.error}`);
  }
  if (config.services.some((s) => s.name === name)) {
    throw new Error(
      `A service named "${name}" already exists in stackr.config.json. ` +
        `Pick a different name or remove the existing entry first.`
    );
  }

  const newServiceDir = path.join(root, name);
  if (await fs.pathExists(newServiceDir)) {
    throw new Error(
      `Directory ${path.relative(root, newServiceDir) || name}/ already exists. ` +
        `stackr refuses to write into an unknown directory. Remove or rename it first.`
    );
  }

  const hasAuthService = config.services.some((s) => s.kind === 'auth');
  const requestedAuthMiddleware = options.authMiddleware ?? (hasAuthService ? 'standard' : 'none');

  if (!hasAuthService && requestedAuthMiddleware !== 'none') {
    throw new Error(
      `Service "${name}" requests auth middleware "${requestedAuthMiddleware}" ` +
        `but this project has no auth service. Options:\n` +
        `  • run with --auth-middleware none\n` +
        `  • add an auth service first (\`stackr add auth\` — coming in a follow-up release)`
    );
  }

  // Lift the loaded on-disk config into an InitConfig-shaped runtime value
  // so buildServiceContext / ServiceGenerator can use it without special-
  // casing the post-init path.
  const baseInitConfig = stackrConfigToInitConfig(config);

  // Port resolution. Explicit port → must be free; otherwise auto-allocate.
  let backendPort: number;
  try {
    backendPort = allocateBackendPort(baseInitConfig.services, options.port);
  } catch (err) {
    if (err instanceof PortCollisionError) {
      throw new Error(
        `Requested backend port ${err.port} is already taken by another service in this monorepo.`
      );
    }
    throw err;
  }

  const webEnabled = Boolean(options.web);
  let webPort = 0;
  if (webEnabled) {
    webPort = allocateWebPort(baseInitConfig.services);
  }

  // Build the new ServiceConfig + InitConfig+1
  const newServiceCfg: ServiceConfig = coreEntry({
    name,
    backend: {
      port: backendPort,
      eventQueue: Boolean(options.eventQueue),
      imageUploads: false,
      authMiddleware: requestedAuthMiddleware,
    },
    web: webEnabled ? { enabled: true, port: webPort } : null,
    mobile: options.mobile ? { enabled: true } : null,
    integrations: noIntegrations(),
  });

  const newInitConfig: InitConfig = {
    ...baseInitConfig,
    services: [...baseInitConfig.services, newServiceCfg],
    customized: true,
  };

  // Keep auth.authConfig.provisioningTargets in sync with the new peer.
  if (hasAuthService) {
    const authIdx = newInitConfig.services.findIndex((s) => s.kind === 'auth');
    const authSvc = newInitConfig.services[authIdx];
    if (authSvc.authConfig) {
      const targets = authSvc.authConfig.provisioningTargets;
      if (!targets.includes(name)) {
        newInitConfig.services[authIdx] = {
          ...authSvc,
          authConfig: {
            ...authSvc.authConfig,
            provisioningTargets: [...targets, name],
          },
        };
      }
    }
  }

  // Final full-config check (catches any invariant we missed)
  const validation = validateConfiguration(newInitConfig);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.error}`);
  }

  // Build the new StackrConfigFile that we'll persist at commit time.
  const stackrVersion = readStackrVersion();
  const now = new Date().toISOString();
  const newConfig: StackrConfigFile = rebuildConfigFromRuntime(config, newInitConfig, name, now, stackrVersion);

  verboseLog(verbose, `Allocated backend port ${backendPort}${webEnabled ? ` and web port ${webPort}` : ''}`);

  // =========================================================================
  // Phase B — stage all writes (no disk mutations outside stagingDir)
  // =========================================================================

  const stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stackr-add-service-'));
  verboseLog(verbose, `Staging dir: ${stagingDir}`);

  let warnings: string[] = [];
  let committed = false;
  try {
    // Render the new service subtree into <stagingDir>/<name>/...
    const newServiceInNewConfig = newInitConfig.services.find((s) => s.name === name)!;
    const newServiceCtx = buildServiceContext(newInitConfig, newServiceInNewConfig);
    await new ServiceGenerator(newServiceCtx).generate(stagingDir);

    // Generate strong random credentials for the new service, then
    // stage <stagingDir>/<name>/backend/.env with them. The same
    // credentials are threaded into the root .env regen below so the
    // backend container and the root docker-compose env_vars agree.
    const newServiceCredentials = new Map<string, ServiceCredentials>();
    newServiceCredentials.set(name, generateServiceCredentials());
    await writeEnvFilesWithCredentials({
      targetDir: stagingDir,
      serviceNames: [name],
      credentialsByService: newServiceCredentials,
    });

    // Compose regeneration. writeMarkedBlock refuses cleanly on missing or
    // corrupt markers; we translate that into a friendly error.
    const composePath = path.join(root, 'docker-compose.yml');
    const composeProdPath = path.join(root, 'docker-compose.prod.yml');

    const plannedComposeYml = await planComposeRegen(
      composePath,
      newConfig,
      'dev',
      Boolean(options.force)
    );
    const plannedComposeProdYml = await planComposeRegen(
      composeProdPath,
      newConfig,
      'prod',
      Boolean(options.force)
    );

    // Root env marker-block append (non-fatal if .env is absent — it only
    // exists after the user has run `setup.sh`). Real random credentials
    // for the new service are threaded in so the appended block has the
    // same values the staged backend/.env will use.
    const envPath = path.join(root, '.env');
    const plannedRootEnv = await planRootEnvRegen(
      envPath,
      newConfig,
      Boolean(options.force),
      newServiceCredentials
    );
    // .env.example is project-shell and always regeneratable. No
    // credentials passed — the committed file keeps the `change-me-*`
    // placeholders so git stays human-readable.
    const envExamplePath = path.join(root, '.env.example');
    const plannedRootEnvExample = await planRootEnvRegen(envExamplePath, newConfig, Boolean(options.force));

    // Auth file regeneration (only when the project has an auth service).
    let plannedAuthFile: { destPath: string; contents: string } | null = null;
    if (hasAuthService) {
      const authRegen = await planAuthFileRegen(
        root,
        config,
        newConfig
      );
      plannedAuthFile = {
        destPath: authRegen.destPath,
        contents: authRegen.plannedContents,
      };
      if (authRegen.collision) {
        warnings.push(
          `auth/backend/lib/auth.ts has been modified locally — the regenerated version has been written to ${path.relative(root, authRegen.destPath)} for manual merging.`
        );
      }
      // Regardless of whether the regenerated file matched pristine or not,
      // the DB schema still needs migrating. Append a pending migration
      // entry against the auth service.
      const authSvcEntry = newConfig.services.find((s) => s.kind === 'auth')!;
      const capName = capitalizeServiceName(name);
      const pendingEntry: PendingMigration = {
        service: authSvcEntry.name,
        reason: `added has${capName}Account additionalField (stackr add service ${name})`,
        createdAt: now,
        createdBy: stackrVersion,
        command: ormMigrationCommand(newConfig.packageManager, newConfig.orm, authSvcEntry.name),
      };
      newConfig.pendingMigrations = [...(newConfig.pendingMigrations ?? []), pendingEntry];
    }

    // =======================================================================
    // Phase C — dry-run validation
    // =======================================================================

    try {
      YAML.parse(plannedComposeYml);
    } catch (err) {
      throw new Error(
        `Planned docker-compose.yml is not valid YAML: ${(err as Error).message}. ` +
          `Aborting before touching disk.`
      );
    }
    try {
      YAML.parse(plannedComposeProdYml);
    } catch (err) {
      throw new Error(
        `Planned docker-compose.prod.yml is not valid YAML: ${(err as Error).message}. ` +
          `Aborting before touching disk.`
      );
    }

    try {
      // Serialization round-trip to catch anything the type system let
      // through but JSON.stringify would trip on (cycles, etc.).
      JSON.parse(JSON.stringify(newConfig));
    } catch (err) {
      throw new Error(
        `Planned stackr.config.json fails to serialize: ${(err as Error).message}. Aborting.`
      );
    }

    // =======================================================================
    // Phase D — commit in one sweep
    // =======================================================================

    // 1. Move rendered service dir into place.
    const stagedServiceDir = path.join(stagingDir, name);
    await moveOrCopy(stagedServiceDir, newServiceDir);

    // 2. Write compose files.
    await fs.writeFile(composePath, plannedComposeYml, 'utf-8');
    await fs.writeFile(composeProdPath, plannedComposeProdYml, 'utf-8');

    // 3. Write root env (only if the in-memory plan changed something).
    if (plannedRootEnv) {
      await fs.writeFile(envPath, plannedRootEnv, 'utf-8');
    }
    if (plannedRootEnvExample) {
      await fs.writeFile(envExamplePath, plannedRootEnvExample, 'utf-8');
    }

    // 4. Write auth file (or .stackr-new fallback).
    if (plannedAuthFile) {
      await fs.ensureDir(path.dirname(plannedAuthFile.destPath));
      await fs.writeFile(plannedAuthFile.destPath, plannedAuthFile.contents, 'utf-8');
    }

    // 5. Save stackr.config.json LAST so an interrupted run leaves the
    //    config as the reliable indicator of partial completion.
    await saveStackrConfig(root, newConfig);

    committed = true;
  } finally {
    // Always clean up the staging dir. If we moved the service dir out of
    // it, fs.remove is a harmless no-op on that subtree.
    await fs.remove(stagingDir).catch(() => {
      /* ignore cleanup errors */
    });
  }

  if (!committed) {
    // Shouldn't be reachable — throws in Phase A–C propagate above without
    // reaching this point — but keep the belt-and-suspenders guard.
    throw new Error('add-service aborted without committing');
  }

  // =========================================================================
  // Phase E — side effects (non-rollback-critical)
  // =========================================================================

  if (install) {
    await runPackageInstalls(root, name, newServiceCfg, newConfig.packageManager, verbose);
  }

  printNextSteps({
    root,
    name,
    backendPort,
    webPort: webEnabled ? webPort : null,
    hasAuthService,
    warnings,
    orm: newConfig.orm,
    packageManager: newConfig.packageManager,
    authServiceName: newConfig.services.find((s) => s.kind === 'auth')?.name ?? null,
  });
}

// ---------------------------------------------------------------------------
// Phase A helpers
// ---------------------------------------------------------------------------

function assertVersionCompatibility(config: StackrConfigFile): void {
  const current = readStackrVersion();
  if (!config.stackrVersion || typeof config.stackrVersion !== 'string') {
    return; // nothing to check
  }
  // If the config was written by a NEWER CLI, refuse. If older, we currently
  // accept (v1 schema — no migrations yet). `migrateConfig` already enforces
  // `version === 1`, so this is purely a per-CLI semver guard.
  try {
    if (semver.gt(config.stackrVersion, current)) {
      throw new Error(
        `stackr.config.json was written by create-stackr v${config.stackrVersion}, ` +
          `but this CLI is v${current}. Please upgrade your installed create-stackr CLI.`
      );
    }
  } catch (err) {
    if (err instanceof InvalidStackrConfigError || err instanceof UnsupportedConfigVersionError) {
      throw err;
    }
    // semver.gt may throw on malformed versions; treat as non-fatal to avoid
    // breaking projects with hand-written configs. The config-file loader
    // already runs the shape validation we actually care about.
    if ((err as Error).message?.includes('upgrade your installed')) {
      throw err;
    }
  }
}

function buildPendingMigrationRefusal(entries: PendingMigration[]): Error {
  const lines: string[] = [
    `${entries.length} pending migration${entries.length === 1 ? '' : 's'} must be resolved before adding another service:`,
    '',
  ];
  for (const entry of entries) {
    lines.push(`  • ${chalk.bold(entry.service)}: ${entry.reason}`);
    lines.push(`      run: ${chalk.cyan(entry.command)}`);
    lines.push(`      then: ${chalk.cyan(`stackr migrations ack ${entry.service}`)}`);
  }
  lines.push('');
  lines.push(`Pass ${chalk.bold('--force')} to stack a new migration on top.`);
  return new Error(lines.join('\n'));
}

/**
 * Build the canonical DB migration command string for an ORM choice.
 */
function ormMigrationCommand(
  pm: 'npm' | 'yarn' | 'bun',
  orm: 'prisma' | 'drizzle',
  serviceName: string
): string {
  const run = pm === 'npm' ? 'npm run' : pm === 'yarn' ? 'yarn' : 'bun run';
  if (orm === 'drizzle') {
    return `cd ${serviceName}/backend && ${run} drizzle-kit generate && ${run} drizzle-kit migrate`;
  }
  return `cd ${serviceName}/backend && ${run} prisma migrate dev`;
}

function capitalizeServiceName(name: string): string {
  // Converts "my-service" → "MyService", "wallet" → "Wallet".
  return name
    .split('-')
    .filter((seg) => seg.length > 0)
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join('');
}

function rebuildConfigFromRuntime(
  existing: StackrConfigFile,
  newInitConfig: InitConfig,
  addedServiceName: string,
  now: string,
  stackrVersion: string
): StackrConfigFile {
  // Preserve everything we can from the on-disk config (createdAt, the
  // original stackrVersion for services we didn't touch, existing
  // pendingMigrations) and overlay the added service + updated auth entry.
  const existingByName = new Map(existing.services.map((s) => [s.name, s]));

  const services: ServiceEntry[] = newInitConfig.services.map((svc): ServiceEntry => {
    const prior = existingByName.get(svc.name);
    if (prior && svc.name !== addedServiceName) {
      // Pre-existing service — keep its original generatedAt/By, but pick
      // up any authConfig changes we may have staged (e.g. updated
      // provisioningTargets on the auth service).
      const merged: ServiceEntry = { ...prior };
      if (svc.kind === 'auth' && svc.authConfig) {
        merged.authConfig = {
          providers: { ...svc.authConfig.providers },
          emailVerification: svc.authConfig.emailVerification,
          passwordReset: svc.authConfig.passwordReset,
          twoFactor: svc.authConfig.twoFactor,
          adminDashboard: svc.authConfig.adminDashboard,
          additionalUserFields: svc.authConfig.additionalUserFields.map((f) => ({ ...f })),
          provisioningTargets: [...svc.authConfig.provisioningTargets],
        };
      }
      return merged;
    }

    // New service — stamp a fresh ServiceEntry with full bookkeeping.
    const entry: ServiceEntry = {
      name: svc.name,
      kind: svc.kind,
      backend: {
        port: svc.backend.port,
        eventQueue: svc.backend.eventQueue,
        imageUploads: svc.backend.imageUploads,
        authMiddleware: svc.backend.authMiddleware,
        ...(svc.backend.roles ? { roles: [...svc.backend.roles] } : {}),
      },
      web: svc.web ? { ...svc.web } : null,
      mobile: svc.mobile ? { ...svc.mobile } : null,
      integrations: {
        revenueCat: { enabled: svc.integrations.revenueCat.enabled },
        adjust: { enabled: svc.integrations.adjust.enabled },
        scate: { enabled: svc.integrations.scate.enabled },
        att: { enabled: svc.integrations.att.enabled },
      },
      generatedAt: now,
      generatedBy: stackrVersion,
    };
    if (svc.kind === 'auth' && svc.authConfig) {
      entry.authConfig = {
        providers: { ...svc.authConfig.providers },
        emailVerification: svc.authConfig.emailVerification,
        passwordReset: svc.authConfig.passwordReset,
        twoFactor: svc.authConfig.twoFactor,
        adminDashboard: svc.authConfig.adminDashboard,
        additionalUserFields: svc.authConfig.additionalUserFields.map((f) => ({ ...f })),
        provisioningTargets: [...svc.authConfig.provisioningTargets],
      };
    }
    return entry;
  });

  return {
    version: 1,
    stackrVersion,
    projectName: existing.projectName,
    createdAt: existing.createdAt,
    packageManager: existing.packageManager,
    orm: existing.orm,
    aiTools: [...existing.aiTools],
    appScheme: existing.appScheme,
    services,
    ...(existing.pendingMigrations ? { pendingMigrations: [...existing.pendingMigrations] } : {}),
  };
}

// ---------------------------------------------------------------------------
// Compose regen
// ---------------------------------------------------------------------------

async function planComposeRegen(
  composePath: string,
  newConfig: StackrConfigFile,
  mode: 'dev' | 'prod',
  force: boolean
): Promise<string> {
  const exists = await fs.pathExists(composePath);
  const fresh = renderComposeInnerBlocks(newConfig, mode);

  if (!exists) {
    // Compose file missing — rebuild from scratch. Slightly unusual but we
    // can recover cleanly so we do.
    const header =
      mode === 'dev'
        ? `# All infrastructure for local development\n# Usage: docker compose up -d\n`
        : `# Production overlay for docker-compose.yml\n# Usage: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d\n`;
    return initComposeWithMarkedBlocks(fresh.services, fresh.volumes, { header });
  }

  const content = await fs.readFile(composePath, 'utf-8');

  // Try to update the services block, then the volumes block (dev only).
  let next: string;
  try {
    next = writeMarkedBlock(content, 'services', fresh.services);
  } catch (err) {
    if (err instanceof MarkerNotFoundError) {
      if (!force) {
        throw new Error(
          `${path.basename(composePath)}: stackr managed "services" marker block is missing. ` +
            `Re-run with --force to regenerate the managed blocks in-place.`
        );
      }
      // Force path: regenerate the whole file from scratch so the user's
      // outside-markers content is discarded (they asked for this).
      const header =
        mode === 'dev'
          ? `# All infrastructure for local development\n# Usage: docker compose up -d\n`
          : `# Production overlay for docker-compose.yml\n# Usage: docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d\n`;
      return initComposeWithMarkedBlocks(fresh.services, fresh.volumes, { header });
    }
    if (err instanceof MarkerCorruptionError) {
      throw new Error(
        `${path.basename(composePath)}: stackr managed "services" block is corrupt (${err.reason}). ` +
          `Inspect the file and restore its markers before re-running.`
      );
    }
    throw err;
  }

  if (mode === 'dev') {
    // The volumes block is only present in the dev compose.
    const volumesBlock = readMarkedBlock(next, 'volumes');
    if (volumesBlock) {
      next = writeMarkedBlock(next, 'volumes', fresh.volumes);
    } else if (!force) {
      throw new Error(
        `${path.basename(composePath)}: stackr managed "volumes" marker block is missing. ` +
          `Re-run with --force to regenerate the managed blocks in-place.`
      );
    } else {
      // Force but no volumes block → append one at the end.
      const sep = detectFileSeparator(next);
      next =
        next.replace(/(\r?\n)+$/, '') +
        sep + sep +
        `volumes:${sep}` +
        `  # >>> stackr managed volumes >>>${sep}` +
        (fresh.volumes.length > 0 ? fresh.volumes : '') +
        (fresh.volumes.endsWith('\n') || fresh.volumes.length === 0 ? '' : sep) +
        `  # <<< stackr managed volumes <<<${sep}`;
    }
  }

  return next;
}

function detectFileSeparator(content: string): '\n' | '\r\n' {
  return content.includes('\r\n') ? '\r\n' : '\n';
}

// ---------------------------------------------------------------------------
// Root env regen
// ---------------------------------------------------------------------------

/**
 * Merge managed-env marker block content: preserve existing values for
 * known keys, append any missing per-service keys at the end. Returns the
 * full planned file contents, or `null` if the file doesn't exist (no-op).
 *
 * `credsByService` is only used when appending NEW key rows — if the
 * user already has a value for a key we preserve it byte-for-byte. Pass
 * real credentials when planning the real `.env`; leave undefined when
 * planning `.env.example` so the committed file keeps placeholder
 * strings.
 */
async function planRootEnvRegen(
  envPath: string,
  newConfig: StackrConfigFile,
  force: boolean,
  credsByService?: ReadonlyMap<string, ServiceCredentials>
): Promise<string | null> {
  const exists = await fs.pathExists(envPath);
  if (!exists) {
    return null;
  }

  const content = await fs.readFile(envPath, 'utf-8');
  let block;
  try {
    block = readMarkedBlock(content, 'env');
  } catch (err) {
    if (err instanceof MarkerCorruptionError) {
      throw new Error(
        `${path.basename(envPath)}: stackr managed "env" block is corrupt (${err.reason}). ` +
          `Inspect the file and restore its markers before re-running.`
      );
    }
    throw err;
  }

  if (!block) {
    if (!force) {
      throw new Error(
        `${path.basename(envPath)}: stackr managed "env" marker block is missing. ` +
          `Re-run with --force to regenerate.`
      );
    }
    // Force: append a fresh managed block at the end of the file.
    const inner = buildFreshEnvInner(newConfig, credsByService);
    const sep = detectFileSeparator(content);
    const trimmed = content.replace(/(\r?\n)+$/, '');
    return (
      trimmed + sep + sep +
      `# >>> stackr managed env >>>${sep}` +
      inner +
      (inner.endsWith('\n') || inner.length === 0 ? '' : sep) +
      `# <<< stackr managed env <<<${sep}`
    );
  }

  const currentInner = block.inner;
  const existingKeys = parseEnvKeys(currentInner);
  const requiredKeys = buildRequiredEnvKeys(newConfig, credsByService);

  // Preserve any KEY=value lines the user already set; only append keys
  // that aren't present yet.
  const missingKeys = requiredKeys.filter(({ key }) => !existingKeys.has(key));
  if (missingKeys.length === 0) {
    return content; // no-op
  }

  const appendLines: string[] = [];
  // Group missing keys by service for nicer comments.
  const byService = new Map<string, { key: string; defaultValue: string }[]>();
  for (const entry of missingKeys) {
    const list = byService.get(entry.service) ?? [];
    list.push(entry);
    byService.set(entry.service, list);
  }

  // Append missing blocks at the end of the inner block.
  const trimmedInner = currentInner.replace(/\s+$/, '');
  if (trimmedInner.length > 0) {
    appendLines.push(''); // blank line separator
  }
  for (const [serviceName, keys] of byService) {
    appendLines.push(`# ---- ${serviceName} ----`);
    for (const { key, defaultValue } of keys) {
      appendLines.push(`${key}=${defaultValue}`);
    }
    appendLines.push('');
  }

  const mergedInner = trimmedInner + '\n' + appendLines.join('\n');
  return writeMarkedBlock(content, 'env', mergedInner);
}

interface EnvKeySpec {
  service: string;
  key: string;
  defaultValue: string;
}

/**
 * Build the list of env keys that every service requires in the root
 * `.env`. When `credsByService` is supplied, the DB / Redis password
 * defaults are taken from the corresponding `ServiceCredentials` entry
 * (real random values, used when writing the real `.env`). When omitted,
 * the defaults fall back to `change-me-*` placeholder strings — that path
 * is used by the `.env.example` regeneration, which must stay
 * human-readable in git.
 */
function buildRequiredEnvKeys(
  config: StackrConfigFile,
  credsByService?: ReadonlyMap<string, ServiceCredentials>
): EnvKeySpec[] {
  const keys: EnvKeySpec[] = [];
  const dbName = (svcName: string): string =>
    `${config.projectName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${svcName.replace(/-/g, '_')}`;

  for (const svc of config.services) {
    const upper = svc.name.toUpperCase().replace(/-/g, '_');
    const creds = credsByService?.get(svc.name);
    keys.push(
      { service: svc.name, key: `${upper}_DB_USER`, defaultValue: 'postgres' },
      {
        service: svc.name,
        key: `${upper}_DB_PASSWORD`,
        defaultValue: creds?.dbPassword ?? `change-me-${svc.name}-db`,
      },
      { service: svc.name, key: `${upper}_DB_NAME`, defaultValue: dbName(svc.name) },
      {
        service: svc.name,
        key: `${upper}_REDIS_PASSWORD`,
        defaultValue: creds?.redisPassword ?? `change-me-${svc.name}-redis`,
      }
    );
  }
  return keys;
}

function buildFreshEnvInner(
  config: StackrConfigFile,
  credsByService?: ReadonlyMap<string, ServiceCredentials>
): string {
  const keys = buildRequiredEnvKeys(config, credsByService);
  const byService = new Map<string, EnvKeySpec[]>();
  for (const k of keys) {
    const list = byService.get(k.service) ?? [];
    list.push(k);
    byService.set(k.service, list);
  }
  const lines: string[] = [];
  for (const [svcName, specs] of byService) {
    lines.push(`# ---- ${svcName} ----`);
    for (const spec of specs) {
      lines.push(`${spec.key}=${spec.defaultValue}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}

function parseEnvKeys(blockInner: string): Set<string> {
  const out = new Set<string>();
  for (const rawLine of blockInner.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out.add(line.slice(0, eq).trim());
  }
  return out;
}

// ---------------------------------------------------------------------------
// Auth file regen
// ---------------------------------------------------------------------------

/**
 * Plan the rewrite of `auth/backend/lib/auth.ts` (if the current on-disk
 * file is bit-identical to what the current `config` would re-render; if
 * the user has hand-edited it, we stage the new contents at
 * `auth.ts.stackr-new` instead and leave the live file untouched).
 */
async function planAuthFileRegen(
  root: string,
  currentConfig: StackrConfigFile,
  newConfig: StackrConfigFile
): Promise<{ destPath: string; plannedContents: string; collision: boolean }> {
  const authSvc = newConfig.services.find((s) => s.kind === 'auth')!;
  const authFilePath = path.join(root, authSvc.name, 'backend/lib/auth.ts');

  const plannedContents = await renderAuthLibFromConfig(newConfig);
  const pristineContents = await renderAuthLibFromConfig(currentConfig);

  // If the current file doesn't exist (edge: user deleted it), fall back
  // to just writing the planned contents.
  if (!(await fs.pathExists(authFilePath))) {
    return { destPath: authFilePath, plannedContents, collision: false };
  }

  const currentContents = await fs.readFile(authFilePath, 'utf-8');
  const currentHash = sha256(currentContents);
  const pristineHash = sha256(pristineContents);

  if (currentHash === pristineHash) {
    // Untouched since last stackr render — safe to overwrite.
    return { destPath: authFilePath, plannedContents, collision: false };
  }

  // User has modified the file — write the regen to .stackr-new.
  return {
    destPath: authFilePath + '.stackr-new',
    plannedContents,
    collision: true,
  };
}

async function renderAuthLibFromConfig(config: StackrConfigFile): Promise<string> {
  const initConfig = stackrConfigToInitConfig(config);
  const authSvc = initConfig.services.find((s) => s.kind === 'auth');
  if (!authSvc) {
    throw new Error('renderAuthLibFromConfig called on a config with no auth service');
  }
  const ctx = buildServiceContext(initConfig, authSvc);
  const templatePath = `services/auth/backend/lib/auth.${config.orm}.ts.ejs`;
  return renderTemplate(templatePath, ctx as unknown as Record<string, unknown>);
}

function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

// ---------------------------------------------------------------------------
// Phase D helpers
// ---------------------------------------------------------------------------

async function moveOrCopy(from: string, to: string): Promise<void> {
  try {
    await fs.rename(from, to);
    return;
  } catch (err) {
    if ((err as { code?: string }).code === 'EXDEV') {
      // Cross-device — fall back to recursive copy + remove.
      await fs.copy(from, to);
      await fs.remove(from);
      return;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Phase E helpers
// ---------------------------------------------------------------------------

async function runPackageInstalls(
  root: string,
  name: string,
  svc: ServiceConfig,
  pm: 'npm' | 'yarn' | 'bun',
  verbose: boolean
): Promise<void> {
  const targets: string[] = [path.join(root, name, 'backend')];
  if (svc.web?.enabled) targets.push(path.join(root, name, 'web'));
  if (svc.mobile?.enabled) targets.push(path.join(root, name, 'mobile'));

  for (const cwd of targets) {
    if (!(await fs.pathExists(cwd))) continue;
    try {
      console.log(chalk.gray(`  running ${pm} install in ${path.relative(root, cwd)}/...`));
      await execa(pm, ['install'], { cwd, stdio: verbose ? 'inherit' : 'pipe' });
    } catch (err) {
      console.log(
        chalk.yellow(
          `\n⚠  ${pm} install failed in ${path.relative(root, cwd)}: ${(err as Error).message}`
        )
      );
      console.log(chalk.yellow(`   Run \`${pm} install\` in ${path.relative(root, cwd)} manually.\n`));
    }
  }
}

function printNextSteps(args: {
  root: string;
  name: string;
  backendPort: number;
  webPort: number | null;
  hasAuthService: boolean;
  warnings: string[];
  orm: 'prisma' | 'drizzle';
  packageManager: 'npm' | 'yarn' | 'bun';
  authServiceName: string | null;
}): void {
  console.log();
  console.log(
    chalk.green.bold(`✨ Service "${args.name}" added successfully!`)
  );
  console.log();

  if (args.hasAuthService && args.authServiceName) {
    const migrateCmd = ormMigrationCommand(args.packageManager, args.orm, args.authServiceName);
    const boxContent = [
      chalk.yellow.bold('⚠  Auth schema changed — DB migration required'),
      '',
      `Run:`,
      `  ${chalk.bold.cyan(migrateCmd)}`,
      '',
      `Then clear the sentinel:`,
      `  ${chalk.bold.cyan(`stackr migrations ack ${args.authServiceName}`)}`,
      '',
      chalk.gray('Until then, stackr will refuse all further subcommands.'),
    ].join('\n');
    console.log(
      boxen(boxContent, {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'yellow',
      })
    );
    console.log();
  }

  console.log(chalk.bold('Next steps:'));
  console.log(`  • Backend is exposed on port ${chalk.cyan(String(args.backendPort))}`);
  if (args.webPort !== null) {
    console.log(`  • Web frontend is exposed on port ${chalk.cyan(String(args.webPort))}`);
  }
  console.log(
    `  • Add routes in ${chalk.cyan(
      `${args.name}/backend/controllers/rest-api/routes/`
    )}`
  );
  if (args.hasAuthService) {
    console.log(
      `  • Requests are authenticated by forwarding cookies to ${chalk.cyan('AUTH_SERVICE_URL')}`
    );
  }
  console.log(`  • Commit the new files to git`);
  console.log();

  if (args.warnings.length > 0) {
    console.log(chalk.yellow.bold('Warnings:'));
    for (const w of args.warnings) {
      console.log(`  ${chalk.yellow('⚠')}  ${w}`);
    }
    console.log();
  }
}

// ---------------------------------------------------------------------------
// Misc
// ---------------------------------------------------------------------------

function verboseLog(verbose: boolean, msg: string): void {
  if (verbose) {
    console.log(chalk.gray(`  [add-service] ${msg}`));
  }
}
