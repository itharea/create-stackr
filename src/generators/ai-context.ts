/**
 * ---------------------------------------------------------------------------
 * AI-context generator — the SOLE writer of every agent-facing artifact.
 * ---------------------------------------------------------------------------
 *
 * Replaces the old PULL router (`templates/shared/AGENTS.md.ejs` fanned into
 * four byte-identical files). Everything an agent reads at the moment of
 * action is emitted here from the single `context-map` table:
 *
 *   - nested `AGENTS.md` (root + service-root + backend/web/mobile subsystems)
 *   - root `CLAUDE.md` = `@AGENTS.md` bridge (Claude ignores AGENTS.md)
 *   - push glob rules: `.cursor/rules/*.mdc` (Cursor) + `.windsurf/rules/*.md`
 *     (Windsurf), one file per applicable folder rule, auto-attached by glob —
 *     these replace the retired flat `.cursorrules` / `.windsurfrules`
 *   - Claude skills: `.claude/skills/**` (knowledge skills `paths:`-globbed from
 *     the same triggerGlobs, plus the `add-domain-entity` codegen wrapper)
 *   - the ast-grep enforcement config: `sgconfig.yml` + `.stackr/sg-rules/*`
 *   - the Claude-Code PostToolUse hook (`.claude/settings.json` + the hook
 *     script) — only when `claude` is a selected tool
 *
 * Because both init (`monorepo.ts`) and `stackr add service` (Phase D) drive
 * this one generator, the artifacts never drift from the live service set —
 * the documented gap the old standalone loop left open.
 *
 * Each per-format renderer below is a small, isolated **adapter**: the shared
 * `ContextRule[]` stays tool-neutral and every adapter absorbs exactly one
 * tool's quirks (frontmatter, glob syntax, JSON shape, ast-grep severity).
 *
 * Honesty: the markdown/rule files are a **salience / delivery + anti-drift**
 * lever — they raise first-pass compliance and guarantee every format derives
 * from one table, but they do not enforce. The `.stackr/sg-rules/*` + the hook
 * are the only pieces that *enforce*, and only for the mechanically-checkable
 * subset once dependencies are installed.
 */

import fs from 'fs-extra';
import path from 'path';
import type { AITool, InitConfig, ServiceConfig, Platform } from '../types/index.js';
import {
  CONTEXT_RULES,
  selectProjectRules,
  selectServiceRules,
  rulesForSubsystem,
  subsystemsForService,
  type ContextRule,
  type Subsystem,
} from '../config/context-map.js';
import { buildServiceContext } from './service-context.js';

/** Closed set of tools we know how to emit for — guards against unknown /
 *  legacy strings round-tripped through `stackr.config.json`. */
const KNOWN_AI_TOOLS: readonly AITool[] = ['claude', 'codex', 'cursor', 'windsurf'];

/**
 * One planned write/delete. Intentionally aligned to `add-service.ts`'s
 * `ProjectE2EPlanEntry` shape (absolute `destPath`, `action`, optional text
 * `contents`) so the existing Phase-D executor can run these entries too.
 */
export interface AIContextArtifact {
  /** Absolute path. */
  destPath: string;
  action: 'write' | 'delete';
  /** Present for `write`; the full file body. */
  contents?: string;
}

export interface BuildAIContextOptions {
  /** Hard override of the tool set (tests). Defaults to `initConfig.aiTools`. */
  aiTools?: AITool[];
}

// Human titles for each folder rule's subsection heading in a subsystem's
// `AGENTS.md`. Kept here (not in the pure-data context-map) since it is purely
// a presentation concern.
const RULE_TITLES: Record<string, string> = {
  'backend-domain': 'Domain (`backend/domain/`)',
  'backend-routes': 'Routes (`backend/controllers/rest-api/routes/`)',
  'backend-plugins': 'Plugins (`backend/controllers/rest-api/plugins/`)',
  'backend-utils': 'Utils (`backend/utils/`)',
  'backend-tests': 'Tests (`backend/tests/`)',
  'web-app': 'App & components (`web/src/app/`, `web/src/components/`)',
  'web-lib-auth': 'Lib / auth (`web/src/lib/`)',
  'web-store': 'Store (`web/src/store/`)',
  'mobile-components': 'Components & theme (`mobile/src/components/`)',
  'mobile-services': 'Services & lib (`mobile/src/services/`, `mobile/src/lib/`)',
};

// Short, human descriptions for each folder rule's glob-rule frontmatter
// (Cursor `.mdc` / Windsurf `.md`). Presentation-only, so it lives here rather
// than in the pure-data context-map.
const RULE_DESCRIPTIONS: Record<string, string> = {
  'backend-domain': 'Backend domain layer conventions (schema, repository, service)',
  'backend-routes': 'Fastify route handler conventions for the REST API layer',
  'backend-plugins': 'Fastify plugin conventions (fastify-plugin wrapping, boot order)',
  'backend-utils': 'Backend utils conventions (singleton db client, ErrorFactory)',
  'backend-tests': 'Backend test conventions (no shared fixtures, no per-test cleanup)',
  'web-app': 'Next.js App Router conventions (Server Components, session reads)',
  'web-lib-auth': 'Web lib/auth conventions (server-only session, use-server actions)',
  'web-store': 'Zustand store conventions (useShallow, one domain per store)',
  'mobile-components': 'Mobile component + theme conventions (theme tokens, native driver)',
  'mobile-services': 'Mobile service layer conventions (shared api instance, SecureStore)',
};

function ruleDescription(rule: ContextRule): string {
  return RULE_DESCRIPTIONS[rule.id] ?? RULE_TITLES[rule.id] ?? rule.id;
}

const SUBSYSTEM_INTRO: Record<Subsystem, (orm: string) => string> = {
  backend: (orm) => `Fastify + TypeBox + ${orm}, layered routes → service → repository → schema.`,
  web: () => 'Next.js (App Router) + Tailwind + shadcn/ui + Zustand. Server Components by default.',
  mobile: () => 'Expo / React Native + Expo Router + Zustand. Themed via `useAppTheme()`.',
};

// ===========================================================================
// Axis derivation — reuse buildServiceContext so axes are never re-derived.
// ===========================================================================

function serviceAxes(initConfig: InitConfig, svc: ServiceConfig): {
  kind: 'auth' | 'base';
  platforms: Platform[];
  orm: InitConfig['orm'];
} {
  const ctx = buildServiceContext(initConfig, svc);
  return { kind: ctx.service.kind, platforms: ctx.platforms, orm: ctx.orm };
}

// ===========================================================================
// Markdown adapters — AGENTS.md (root, service-root, subsystem) + CLAUDE.md.
// ===========================================================================

function bullets(items: readonly string[]): string {
  return items.map((b) => `- ${b}`).join('\n');
}

function serviceLine(svc: ServiceConfig): string {
  const parts = [`backend \`:${svc.backend.port}\``];
  if (svc.web && svc.web.enabled) parts.push(`web \`:${svc.web.port}\``);
  if (svc.mobile && svc.mobile.enabled) parts.push('mobile (Expo)');
  const anchor = svc.kind === 'auth' ? ' — trust anchor' : '';
  return `- \`${svc.name}\` (${svc.kind}) — ${parts.join(', ')}${anchor}`;
}

function renderRootAgentsMd(initConfig: InitConfig): string {
  const pm = initConfig.packageManager;
  const anyTests = initConfig.services.some((s) => s.backend.tests);
  const project = selectProjectRules();

  const commands = [
    `- Install: \`${pm} run setup\``,
    `- Dev (all services): \`${pm} run docker:dev\``,
    ...(anyTests
      ? [`- Test: \`${pm} run test\` (per service: \`cd <service>/backend && ${pm} run test\`)`]
      : []),
    `- Lint rules (ast-grep): \`${pm} run lint:sg\``,
  ].join('\n');

  const arch = project
    .map((r) => r.architectureProse)
    .filter(Boolean)
    .join('\n\n');

  return `# ${initConfig.projectName}

Multi-service monorepo scaffolded with stackr. Each service owns its own
Postgres + Redis and deploys independently. \`stackr.config.json\` is the
source of truth for which services exist.

## Commands

${commands}

## Services

${initConfig.services.map(serviceLine).join('\n')}

## Architecture

${arch}

## Rules (MUST / NEVER)

${bullets(project.flatMap((r) => r.ruleSummary))}

Layer-specific rules live in each service's \`AGENTS.md\` and its
\`backend/\`, \`web/\`, and \`mobile/\` \`AGENTS.md\` files — read the one for
the area you are editing.
`;
}

function renderClaudeMd(initConfig: InitConfig): string {
  const pm = initConfig.packageManager;
  // `@imports` resolve relative to the importing file, so the sibling root
  // AGENTS.md (always emitted) is present — the import never dangles.
  return `@AGENTS.md

## Claude Code specifics

- The shared monorepo guidance lives in \`AGENTS.md\` (imported above) and in
  the nested \`AGENTS.md\` files under each service.
- Run \`${pm} run test\` before committing (never the raw test binary).
- A PostToolUse hook lints each \`.ts\`/\`.tsx\` file you edit once dependencies
  are installed; fix what it reports.
`;
}

function renderServiceAgentsMd(
  initConfig: InitConfig,
  svc: ServiceConfig,
  axes: { kind: 'auth' | 'base'; platforms: Platform[]; orm: InitConfig['orm'] }
): string {
  const rules = selectServiceRules(axes);
  const subs = subsystemsForService(axes);

  const archParts = subs
    .map((sub) => rulesForSubsystem(rules, sub).map((r) => r.architectureProse).find(Boolean))
    .filter(Boolean);

  const trustAnchor =
    axes.kind === 'auth'
      ? 'This is the **trust anchor**. It OWNS the `user`, `session`, `account`, and `verification` tables. No other service may declare them.'
      : 'NEVER add `user`/`session` tables here — verify callers by forwarding the cookie to `${AUTH_SERVICE_URL}/api/auth/get-session` and reading `request.user`.';

  const subList = subs.map((s) => `\`${s}/AGENTS.md\``).join(', ');

  return `# \`${svc.name}\` service (${svc.kind})

Backend on port \`${svc.backend.port}\`. Subsystems: ${subs.join(', ')}.

## Architecture

${archParts.join('\n\n')}

## Trust boundary

${trustAnchor}

Layer rules: ${subList}.
`;
}

function renderSubsystemAgentsMd(
  svc: ServiceConfig,
  subsystem: Subsystem,
  rules: ContextRule[],
  orm: string
): string {
  const subRules = rulesForSubsystem(rules, subsystem);
  const sections = subRules
    .map((r) => `### ${RULE_TITLES[r.id] ?? r.id}\n\n${bullets(r.ruleSummary)}`)
    .join('\n\n');

  return `# \`${svc.name}\` / ${subsystem}

${SUBSYSTEM_INTRO[subsystem](orm)}

## Rules (MUST / NEVER)

${sections}
`;
}

// ===========================================================================
// Push glob-rule adapters — Cursor `.mdc` + Windsurf `.md`. One file per
// applicable folder rule; the agent's tool auto-attaches it by glob when a
// matching file is edited. These replace the retired flat single-file formats.
// Both bodies derive from the SAME `ruleSummary`, so they cannot disagree.
// ===========================================================================

/**
 * Cursor `.cursor/rules/<id>.mdc`. Footguns the syntax guards against:
 *  - `globs` MUST be a BARE comma-separated string — never a YAML array, never
 *    quoted — or Cursor silently never matches.
 *  - the file MUST start with `---\n` (no leading whitespace) or the
 *    frontmatter is ignored.
 *  - do NOT rely on `alwaysApply: true` (demoted to "requestable" in 3.0.16+);
 *    Auto-Attach = `alwaysApply: false` + `globs`.
 */
function renderCursorRule(rule: ContextRule): string {
  return `---
description: ${ruleDescription(rule)}
globs: ${rule.triggerGlobs.join(', ')}
alwaysApply: false
---
${bullets(rule.ruleSummary)}
`;
}

/**
 * Windsurf `.windsurf/rules/<id>.md`. `trigger: glob` + `globs:` loads the body
 * only on a file match; bodies are capped at 12,000 chars/file (our rule bodies
 * are a handful of bullets — far under, asserted in the unit test).
 */
function renderWindsurfRule(rule: ContextRule): string {
  return `---
trigger: glob
globs: ${rule.triggerGlobs.join(', ')}
description: ${ruleDescription(rule)}
---
${bullets(rule.ruleSummary)}
`;
}

/**
 * The set of folder-rule ids that apply to ANY service in this project (union
 * across services). For v1 the glob rules are emitted root-level (not per
 * nested service dir), so a rule is emitted once if any service triggers it.
 */
function applicableFolderRuleIds(initConfig: InitConfig): Set<string> {
  const ids = new Set<string>();
  for (const svc of initConfig.services) {
    for (const rule of selectServiceRules(serviceAxes(initConfig, svc))) {
      if (rule.scope === 'folder') ids.add(rule.id);
    }
  }
  return ids;
}

// ===========================================================================
// Enforcement adapters — ast-grep config + rules (the only enforcing layer).
// ===========================================================================

function renderSgConfig(): string {
  return `# ast-grep project config — see https://ast-grep.github.io/reference/sgconfig.html
ruleDirs:
  - .stackr/sg-rules
`;
}

function renderRepoCatchRule(): string {
  // Containment rule: every catch in a repository must rethrow a databaseError.
  // Validated clean against the generated auth repositories (18/18 catches).
  return `id: repo-catch-database-error
language: TypeScript
files:
  - "**/backend/domain/**/repository.ts"
rule:
  kind: catch_clause
  not:
    has:
      stopBy: end
      pattern: throw ErrorFactory.databaseError($$$)
message: "Repository catch blocks must throw ErrorFactory.databaseError({ operation, ...context, originalError })."
severity: error
`;
}

/**
 * Drizzle-only: forbid the auth-owned tables in any NON-auth service's schema.
 * `files` is generated from the actual non-auth service paths (the auth path
 * is simply never listed), so this is precise rather than an ignore-glob
 * heuristic. Prisma parity is handled by `scripts/check-auth-tables.mjs`
 * (`.prisma` is not TypeScript).
 */
function renderNoAuthTablesRule(nonAuthServiceNames: string[]): string {
  const files = nonAuthServiceNames
    .map((name) => `  - "${name}/backend/drizzle/**/*.ts"`)
    .join('\n');
  return `id: no-auth-tables-outside-auth
language: TypeScript
files:
${files}
rule:
  pattern: pgTable($NAME, $$$)
constraints:
  NAME:
    # $NAME is the first-arg string literal; its text includes the surrounding
    # quote chars, so a leading/trailing "." matches either quote style.
    regex: "^.(user|session|account|verification).$"
message: "Only the auth service may declare user/session/account/verification tables. Verify sessions via \${AUTH_SERVICE_URL}/api/auth/get-session."
severity: error
`;
}

function renderMobileNativeDriverRule(): string {
  // Flags Animated.timing/spring calls that OMIT useNativeDriver entirely (the
  // real bug RN warns about). Explicit `useNativeDriver: false` (intentional —
  // e.g. animating borderColor) is allowed. The omission check matches the
  // config object's `pair` whose `key` field is `useNativeDriver`; an earlier
  // attempt used `pattern: "useNativeDriver: $V"`, which ast-grep parses as a
  // labeled statement (never matching a property) and silently flagged every
  // call. Validated: 0 hits on a pristine generated mobile app.
  return `id: mobile-animated-native-driver
language: Tsx
files:
  - "**/mobile/**/*.tsx"
  - "**/mobile/**/*.ts"
rule:
  any:
    - pattern: Animated.timing($$$A)
    - pattern: Animated.spring($$$A)
  not:
    has:
      stopBy: end
      kind: pair
      has:
        field: key
        regex: "^useNativeDriver$"
message: "Animated.timing/spring must set useNativeDriver (use true unless animating a non-layout property like borderColor)."
severity: error
`;
}

function renderMobileNoDirectFetchRule(): string {
  // Presentation-layer scope only (screens + components). The UI must never
  // raw-fetch — it goes through a hook/service. The DATA layer (hooks, lib,
  // services, store) is intentionally NOT covered: the auth hook legitimately
  // fetches the *auth service* cross-service, which the single-host `api`
  // instance (pointed at this service's own backend) cannot serve. Matches a
  // bare `fetch(...)` callee only, never `api.get`/`refetch`. Validated: 0 hits
  // on a pristine generated mobile app.
  return `id: mobile-no-direct-fetch
language: Tsx
files:
  - "**/mobile/src/components/**/*.tsx"
  - "**/mobile/app/**/*.tsx"
rule:
  pattern: fetch($$$)
message: "UI components must not call fetch() directly — go through a hook or service (the shared 'api' axios instance applies the auth/device-session interceptors)."
severity: error
`;
}

function renderMobileNoHardcodedColorRule(): string {
  // Hex-only (rgba translucency is an accepted exception until theme exposes
  // translucent tokens). Scoped to feature/screen code; the design-system
  // primitives (components/ui) own the palette, and the 2FA-setup screen needs
  // a literal white QR background for scanability — both are ignored. Paywall
  // is feature-gated and retains brand status colors pending a themify pass.
  return `id: mobile-no-hardcoded-color
language: Tsx
files:
  - "**/mobile/src/components/**/*.tsx"
  - "**/mobile/app/**/*.tsx"
ignores:
  - "**/mobile/src/components/ui/**"
  - "**/security/two-factor-setup.tsx"
  - "**/app/paywall.tsx"
rule:
  kind: string
  regex: "#[0-9a-fA-F]{6}"
message: "Use theme.colors.* via useAppTheme() instead of a hardcoded hex color."
severity: error
`;
}

// ===========================================================================
// Claude PostToolUse hook adapter.
// ===========================================================================

function renderClaudeSettings(): string {
  // Built as a literal so the JSON is byte-stable across runs (idempotency).
  const settings = {
    hooks: {
      PostToolUse: [
        {
          matcher: 'Edit|Write|MultiEdit',
          hooks: [{ type: 'command', timeout: 120, command: 'node .claude/hooks/check-edited.mjs' }],
        },
      ],
    },
  };
  return JSON.stringify(settings, null, 2) + '\n';
}

function renderCheckEditedHook(): string {
  return `#!/usr/bin/env node
/**
 * Claude Code PostToolUse hook. Lints the file that was just edited and feeds
 * any diagnostics back to the model (exit 2 surfaces stderr for self-repair).
 *
 * No-ops (exit 0) when the nearest service's ESLint / node_modules are not yet
 * installed — the common state on a freshly scaffolded repo, which is exactly
 * when an agent first edits. Resolves the nearest backend ESLint root from the
 * stdin file path; never invokes a non-existent root tsconfig.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let payload = {};
try {
  payload = JSON.parse(readStdin() || '{}');
} catch {
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path;
if (!filePath || !/\\.(ts|tsx)$/.test(filePath) || !fs.existsSync(filePath)) {
  process.exit(0);
}

function findEslintRoot(startDir) {
  let dir = startDir;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const cfg = path.join(dir, 'eslint.config.mjs');
    const bin = path.join(dir, 'node_modules', '.bin', 'eslint');
    if (fs.existsSync(cfg) && fs.existsSync(bin)) return { dir, bin };
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const resolved = path.resolve(filePath);
const root = findEslintRoot(path.dirname(resolved));
if (!root) process.exit(0); // deps not installed yet — stay silent.

const res = spawnSync(root.bin, ['--max-warnings', '0', resolved], {
  cwd: root.dir,
  encoding: 'utf8',
});

if (res.status === 0) process.exit(0);

const out = \`\${res.stdout || ''}\${res.stderr || ''}\`.trim();
process.stderr.write(\`ESLint found issues in \${path.basename(resolved)}:\\n\${out}\\n\`);
process.exit(2);
`;
}

// ===========================================================================
// Plan builder — the single producer of every artifact.
// ===========================================================================

function normalizeTools(tools: readonly string[]): AITool[] {
  const known = KNOWN_AI_TOOLS as readonly string[];
  const unknown = tools.filter((t) => !known.includes(t));
  if (unknown.length > 0) {
    // Surface silently-dropped tools (e.g. a typo'd / legacy entry in a
    // hand-edited stackr.config.json) so the user isn't left wondering why a
    // tool's files were never written.
    console.warn(
      `[stackr] Ignoring unknown aiTools ${JSON.stringify(unknown)}; known tools are ${KNOWN_AI_TOOLS.join(', ')}.`
    );
  }
  return tools.filter((t): t is AITool => known.includes(t));
}

/**
 * Pure: returns the full write/delete plan for a project's agent-facing
 * artifacts. `targetDir` is the absolute project root. Safe to call from both
 * init and the `stackr add service` regen path.
 */
export function buildAIContextPlan(
  targetDir: string,
  initConfig: InitConfig,
  opts: BuildAIContextOptions = {}
): AIContextArtifact[] {
  const tools = normalizeTools(opts.aiTools ?? initConfig.aiTools ?? []);
  const has = (t: AITool) => tools.includes(t);
  const plan: AIContextArtifact[] = [];
  const write = (rel: string, contents: string) =>
    plan.push({ destPath: path.join(targetDir, rel), action: 'write', contents });
  const del = (rel: string) => plan.push({ destPath: path.join(targetDir, rel), action: 'delete' });

  // --- Markdown backbone (always; decoupled from any single tool selection) ---
  write('AGENTS.md', renderRootAgentsMd(initConfig));
  write('CLAUDE.md', renderClaudeMd(initConfig));

  const nonAuthNames = initConfig.services.filter((s) => s.kind !== 'auth').map((s) => s.name);
  const hasAuth = initConfig.services.some((s) => s.kind === 'auth');
  const hasMobile = initConfig.services.some((s) => s.mobile?.enabled);

  for (const svc of initConfig.services) {
    const axes = serviceAxes(initConfig, svc);
    const rules = selectServiceRules(axes);
    write(path.join(svc.name, 'AGENTS.md'), renderServiceAgentsMd(initConfig, svc, axes));
    for (const subsystem of subsystemsForService(axes)) {
      write(
        path.join(svc.name, subsystem, 'AGENTS.md'),
        renderSubsystemAgentsMd(svc, subsystem, rules, axes.orm)
      );
    }
  }

  // --- Enforcement: ast-grep config + rules (tool-agnostic; always shipped) ---
  write('sgconfig.yml', renderSgConfig());
  write(path.join('.stackr', 'sg-rules', 'repo-catch-database-error.yml'), renderRepoCatchRule());

  // Drizzle-only structural rule for the no-auth-tables boundary (Prisma uses
  // the node-script). Needs an auth service AND at least one non-auth service.
  if (initConfig.orm === 'drizzle' && hasAuth && nonAuthNames.length > 0) {
    write(
      path.join('.stackr', 'sg-rules', 'no-auth-tables-outside-auth.yml'),
      renderNoAuthTablesRule(nonAuthNames)
    );
  } else {
    del(path.join('.stackr', 'sg-rules', 'no-auth-tables-outside-auth.yml'));
  }

  // Mobile rules ship only when a service has a mobile app. All three are
  // validated clean on a pristine generated tree (see each renderer).
  const mobileRules: [string, () => string][] = [
    ['mobile-animated-native-driver.yml', renderMobileNativeDriverRule],
    ['mobile-no-direct-fetch.yml', renderMobileNoDirectFetchRule],
    ['mobile-no-hardcoded-color.yml', renderMobileNoHardcodedColorRule],
  ];
  for (const [file, render] of mobileRules) {
    if (hasMobile) write(path.join('.stackr', 'sg-rules', file), render());
    else del(path.join('.stackr', 'sg-rules', file));
  }

  // --- Push glob rules (Cursor `.mdc` / Windsurf `.md`) — one file per
  //     applicable folder rule. Wholesale-regenerated; user edits discarded. ---
  const folderRules = CONTEXT_RULES.filter((r) => r.scope === 'folder');
  const applicable = applicableFolderRuleIds(initConfig);

  // The legacy single-file formats are retired (M3): never written, always
  // deleted so a regen / `migrate context` sweep removes any stale copy.
  del('.cursorrules');
  del('.windsurfrules');

  if (has('cursor')) {
    for (const rule of folderRules) {
      const rel = path.join('.cursor', 'rules', `${rule.id}.mdc`);
      if (applicable.has(rule.id)) write(rel, renderCursorRule(rule));
      else del(rel); // a now-inapplicable rule (e.g. last mobile service removed)
    }
  } else {
    del(path.join('.cursor', 'rules')); // tool dropped → remove the whole dir
  }

  if (has('windsurf')) {
    for (const rule of folderRules) {
      const rel = path.join('.windsurf', 'rules', `${rule.id}.md`);
      if (applicable.has(rule.id)) write(rel, renderWindsurfRule(rule));
      else del(rel);
    }
  } else {
    del(path.join('.windsurf', 'rules'));
  }

  if (has('claude')) {
    write(path.join('.claude', 'settings.json'), renderClaudeSettings());
    write(path.join('.claude', 'hooks', 'check-edited.mjs'), renderCheckEditedHook());
  } else {
    del(path.join('.claude', 'settings.json'));
    del(path.join('.claude', 'hooks', 'check-edited.mjs'));
  }

  return plan;
}

/**
 * Execute a plan produced by {@link buildAIContextPlan}. Writes create parent
 * dirs; deletes are best-effort (a missing target is a no-op). The hook script
 * is made executable.
 */
export async function writeAIContextPlan(plan: AIContextArtifact[]): Promise<void> {
  for (const entry of plan) {
    if (entry.action === 'delete') {
      await fs.remove(entry.destPath);
      continue;
    }
    await fs.ensureDir(path.dirname(entry.destPath));
    await fs.writeFile(entry.destPath, entry.contents ?? '');
    if (entry.destPath.endsWith('check-edited.mjs')) {
      await fs.chmod(entry.destPath, 0o755).catch(() => {});
    }
  }
}

/** Re-export so callers can reason about the closed tool set. */
export { KNOWN_AI_TOOLS, CONTEXT_RULES };
