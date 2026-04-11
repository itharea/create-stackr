import ejs from 'ejs';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import type { ServiceRenderContext } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get template directory path
export const TEMPLATE_DIR = path.join(__dirname, '../../templates');

/**
 * Render an EJS template with the given render context.
 */
export async function renderTemplate(
  templatePath: string,
  ctx: ServiceRenderContext | Record<string, unknown>
): Promise<string> {
  const fullPath = path.join(TEMPLATE_DIR, templatePath);

  if (!(await fs.pathExists(fullPath))) {
    throw new Error(`Template not found: ${templatePath}`);
  }

  const content = await fs.readFile(fullPath, 'utf-8');
  return ejs.render(content, ctx);
}

/**
 * Check if a file should be included based on the service render context.
 *
 * Reads exclusively from the per-service `ctx` — the legacy shim fields
 * (`ctx.platforms`, `ctx.features`, `ctx.integrations`, `ctx.backend`) are
 * populated by `buildServiceContext` so this function can continue using the
 * pre-phase-2 predicates that already cover every conditional template.
 */
export function shouldIncludeFile(
  filePath: string,
  ctx: ServiceRenderContext
): boolean {
  // Skip .gitkeep files — version-control only
  if (filePath.endsWith('.gitkeep')) {
    return false;
  }

  // Skip AGENTS.md — rendered separately by the monorepo root pass
  if (filePath.includes('shared/AGENTS.md')) {
    return false;
  }

  // Only the auth service should consume templates/services/auth/**
  if (filePath.includes('services/auth/') && ctx.service.kind !== 'auth') {
    return false;
  }
  // Symmetrically, non-auth services don't render auth-specific trees
  if (filePath.includes('services/base/') && ctx.service.kind === 'auth') {
    return false;
  }

  // ==========================================================================
  // Platform-based filtering (consistent architecture)
  // ==========================================================================
  if (filePath.includes('/mobile/') && !ctx.platforms.includes('mobile')) {
    return false;
  }

  if (filePath.includes('/web/') && !ctx.platforms.includes('web')) {
    return false;
  }

  // Feature-gated mobile templates
  if (filePath.includes('features/mobile/onboarding') && !ctx.features.onboarding.enabled) {
    return false;
  }

  if (filePath.includes('features/mobile/auth') && !ctx.features.authentication.enabled) {
    return false;
  }

  if (filePath.includes('features/web/auth') && !ctx.features.authentication.enabled) {
    return false;
  }

  if (filePath.includes('verify-email') && !ctx.features.authentication.emailVerification) {
    return false;
  }

  if (
    (filePath.includes('forgot-password') || filePath.includes('reset-password')) &&
    !ctx.features.authentication.passwordReset
  ) {
    return false;
  }

  if (filePath.includes('two-factor') && !ctx.features.authentication.twoFactor) {
    return false;
  }

  if (filePath.includes('features/mobile/paywall') && !ctx.features.paywall) {
    return false;
  }

  if (filePath.includes('integrations/mobile/revenuecat') && !ctx.integrations.revenueCat.enabled) {
    return false;
  }

  if (filePath.includes('integrations/mobile/adjust') && !ctx.integrations.adjust.enabled) {
    return false;
  }

  if (filePath.includes('integrations/mobile/scate') && !ctx.integrations.scate.enabled) {
    return false;
  }

  if (filePath.includes('integrations/mobile/att') && !ctx.integrations.att.enabled) {
    return false;
  }

  // SDK initializer only if any SDK is enabled
  if (filePath.includes('services/sdkInitializer')) {
    const hasAnySdk =
      ctx.integrations.revenueCat.enabled ||
      ctx.integrations.adjust.enabled ||
      ctx.integrations.scate.enabled;
    return hasAnySdk;
  }

  // Backend conditional files
  if (filePath.includes('controllers/event-queue') && !ctx.backend.eventQueue) {
    return false;
  }

  // Email service — only include when email verification or password reset is enabled
  if (
    filePath.includes('utils/email') &&
    !ctx.features.authentication.emailVerification &&
    !ctx.features.authentication.passwordReset
  ) {
    return false;
  }

  // Device session is an auth-specific feature: only include in the auth
  // service subtree. Base services don't manage device sessions anymore
  // (auth service owns them).
  if (filePath.includes('domain/device-session') && ctx.service.kind !== 'auth') {
    return false;
  }
  if (filePath.includes('controllers/rest-api/routes/device-sessions') && ctx.service.kind !== 'auth') {
    return false;
  }

  // ORM-specific file filtering
  const orm = ctx.backend.orm;

  if (orm !== 'prisma') {
    if (filePath.includes('/prisma/')) return false;
    if (filePath.includes('.prisma.ts')) return false;
  }

  if (orm !== 'drizzle') {
    if (filePath.includes('/drizzle/')) return false;
    if (filePath.includes('.drizzle.ts')) return false;
  }

  return true;
}

/**
 * Check if a file is an EJS template
 */
export function isTemplate(filePath: string): boolean {
  return filePath.endsWith('.ejs');
}

/**
 * Prefix-swap mapping table — covers cases where a template path maps to a
 * destination purely by swapping a prefix. Features and integrations still
 * fan out to multiple subpaths based on the rest of the path, so they stay
 * imperative in the switch below.
 *
 * Phase 2: each mapping is parameterized by `serviceName` at call time so
 * the same table works for `core/`, `auth/`, `scout/`, etc.
 */
const SIMPLE_PATH_MAPPINGS: readonly { from: string; to: (serviceName: string) => string }[] = [
  { from: 'services/base/backend/', to: (svc) => `${svc}/backend/` },
  { from: 'services/base/mobile/', to: (svc) => `${svc}/mobile/` },
  { from: 'services/base/web/', to: (svc) => `${svc}/web/` },
  { from: 'services/auth/backend/', to: (svc) => `${svc}/backend/` },
  { from: 'services/auth/web/', to: (svc) => `${svc}/web/` },
  // shared/* lives at the monorepo root — no service prefix.
  { from: 'shared/', to: () => '' },
  // project/* maps to project root directly (project-shell templates).
  { from: 'project/', to: () => '' },
];

export interface GetDestinationPathOptions {
  serviceName: string;
}

/**
 * Get destination path for a template file
 * Removes .ejs extension and maps template path to project path
 */
export function getDestinationPath(
  templatePath: string,
  targetDir: string,
  opts: GetDestinationPathOptions
): string {
  const serviceName = opts.serviceName;
  let relativePath = templatePath;

  // Remove templates/ prefix
  if (relativePath.startsWith('templates/')) {
    relativePath = relativePath.substring('templates/'.length);
  }

  // ==========================================================================
  // Simple prefix swaps
  // ==========================================================================
  let mapped = false;
  for (const mapping of SIMPLE_PATH_MAPPINGS) {
    if (relativePath.startsWith(mapping.from)) {
      relativePath = mapping.to(serviceName) + relativePath.substring(mapping.from.length);
      mapped = true;
      break;
    }
  }

  // ==========================================================================
  // Mobile features and integrations (rescoped per-service in phase 2)
  // ==========================================================================
  if (!mapped) {
    // features/mobile/*/app/* → <service>/mobile/app/*
    if (relativePath.startsWith('features/mobile/')) {
      const featurePath = relativePath.substring('features/mobile/'.length);
      const restOfPath = featurePath.substring(featurePath.indexOf('/') + 1);

      let subpath: string;
      if (restOfPath.startsWith('app/') || restOfPath === 'app') {
        subpath = `mobile/${restOfPath}`;
      } else if (['services', 'store', 'hooks', 'components', 'types'].some(dir => restOfPath.startsWith(dir + '/') || restOfPath === dir)) {
        subpath = `mobile/src/${restOfPath}`;
      } else {
        subpath = `mobile/${restOfPath}`;
      }

      relativePath = `${serviceName}/${subpath}`;
    }

    // integrations/mobile/*/services/* → <service>/mobile/src/services/*
    else if (relativePath.startsWith('integrations/mobile/')) {
      const integrationPath = relativePath.substring('integrations/mobile/'.length);
      const restOfPath = integrationPath.substring(integrationPath.indexOf('/') + 1);

      let subpath: string;
      if (restOfPath.startsWith('services/') || restOfPath.startsWith('store/')) {
        subpath = `mobile/src/${restOfPath}`;
      } else {
        subpath = `mobile/${restOfPath}`;
      }

      relativePath = `${serviceName}/${subpath}`;
    }

    // features/web/*/app/* → <service>/web/src/app/*
    else if (relativePath.startsWith('features/web/')) {
      const featurePath = relativePath.substring('features/web/'.length);
      const restOfPath = featurePath.substring(featurePath.indexOf('/') + 1);

      let subpath: string;
      if (restOfPath.startsWith('app/') || restOfPath === 'app') {
        subpath = `web/src/${restOfPath}`;
      } else if (['components', 'lib', 'hooks'].some(dir => restOfPath.startsWith(dir + '/') || restOfPath === dir)) {
        subpath = `web/src/${restOfPath}`;
      } else {
        subpath = `web/${restOfPath}`;
      }

      relativePath = `${serviceName}/${subpath}`;
    }

    // integrations/web/* → <service>/web/src/*
    else if (relativePath.startsWith('integrations/web/')) {
      const integrationPath = relativePath.substring('integrations/web/'.length);
      const restOfPath = integrationPath.substring(integrationPath.indexOf('/') + 1);

      relativePath = `${serviceName}/web/src/${restOfPath}`;
    }
  }

  // Remove ORM suffix from file names (.prisma.ts → .ts, .drizzle.ts → .ts)
  relativePath = relativePath.replace(/\.prisma\.ts/, '.ts');
  relativePath = relativePath.replace(/\.drizzle\.ts/, '.ts');

  // Remove .ejs extension
  if (relativePath.endsWith('.ejs')) {
    relativePath = relativePath.substring(0, relativePath.length - 4);
  }

  return path.join(targetDir, relativePath);
}
