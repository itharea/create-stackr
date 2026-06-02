/**
 * ---------------------------------------------------------------------------
 * Context map — the single source of truth for agent-facing guidance.
 * ---------------------------------------------------------------------------
 *
 * This file is intentionally **pure types + data** — no runtime imports that
 * would pull in file I/O (mirrors the `src/types/config-file.ts` convention).
 * Any emitter can import it safely.
 *
 * Every agent-facing artifact a generated project ships — the nested
 * `AGENTS.md` files, the root `CLAUDE.md` bridge, and (in later milestones)
 * the Cursor / Windsurf glob rules and Claude skills — is rendered from the
 * one `CONTEXT_RULES` table below by `src/generators/ai-context.ts`. Because
 * every format derives from the same `ruleSummary` strings, they cannot
 * disagree on *which* rules apply or *what the rule text is*.
 *
 * Honesty: this table is a **salience / delivery** lever. The `ruleSummary`
 * bullets raise the probability the right rule is in front of the model when
 * it edits a matching file; they do not enforce anything. Enforcement is the
 * separate `lintRuleIds` → ast-grep / ESLint layer plus code review. A rule's
 * `ruleClass` annotations live in `LLM_CONTEXT_PLAN.md`, not here — this file
 * carries only the canonical bullet text and the glob → rule mapping.
 */

import type { ORMChoice, Platform } from '../types/index.js';

/** Where a rule sits in the hierarchy. */
export type RuleScope = 'project' | 'service' | 'folder';

/** Which service kind a rule applies to. Mirrors `ServiceConfig.kind` plus
 *  `'both'` for rules shared by auth and base services. */
export type RuleKind = 'auth' | 'base' | 'both';

/** The service-root subsystem a folder rule folds up into. `undefined` for
 *  project-scope rules. */
export type Subsystem = 'backend' | 'web' | 'mobile';

/**
 * One declarative guidance entry. A glob (`triggerGlobs`) maps to its
 * canonical rule text (`ruleSummary`), the long-form rationale folded out of
 * the deleted `DESIGN.md` files (`architectureProse`), and the enforcement
 * rules that *gate* the mechanically-checkable subset (`lintRuleIds`).
 */
export interface ContextRule {
  /** Unique; doubles as the rule-file / skill basename. */
  id: string;
  scope: RuleScope;
  kind: RuleKind;
  /** Which subsystem `AGENTS.md` this folder rule's bullets fold into. */
  subsystem?: Subsystem;
  /** Globs (relative, `**`-prefixed) that should surface this rule when the
   *  agent edits a matching file. Source for the future Cursor/Windsurf/Claude
   *  glob rules and for documenting which files an `lintRuleId` covers. */
  triggerGlobs: string[];
  /** Imperative MUST/NEVER one-liners — the canonical, format-agnostic rule
   *  text. Kept lean (~5 max per node) so co-located guidance reads as hard
   *  constraints, not a diluted suggestion list. */
  ruleSummary: string[];
  /** Long-form rationale folded out of the (now-deleted) co-located
   *  `DESIGN.md`. Rendered ONLY into the service-root `AGENTS.md` Architecture
   *  section (and, in a later milestone, Claude skill bodies) — never into the
   *  lean per-subsystem bullet lists. */
  architectureProse?: string;
  /** Enforcement contract: ids of the ast-grep / ESLint rules that gate this
   *  rule's mechanically-checkable subset. Empty when the rule is salience-only. */
  lintRuleIds?: string[];
  /** Conditional axes. A rule only renders when the service matches every set
   *  axis. Consumed from a built `ServiceRenderContext`, never re-derived. */
  axes?: Partial<{
    orm: ORMChoice;
    authEnabled: boolean;
    sessionManagement: boolean;
    platform: Platform;
    eventQueue: boolean;
  }>;
}

/**
 * The table. Ordering within a subsystem is the order bullets appear in the
 * rendered `AGENTS.md`.
 */
export const CONTEXT_RULES: readonly ContextRule[] = [
  // ===========================================================================
  // Project scope — cross-service invariants, reinforced at the root.
  // ===========================================================================
  {
    id: 'project-cross-service',
    scope: 'project',
    kind: 'both',
    triggerGlobs: ['**/*'],
    ruleSummary: [
      'NEVER add `user`, `session`, `account`, or `verification` tables outside the `auth` service — it is the trust anchor that owns them.',
      'In a non-auth service you MUST authenticate the caller by forwarding the request cookie to `${AUTH_SERVICE_URL}/api/auth/get-session` and reading the decorated `request.user` — never trust a header or a client-supplied user id.',
      "NEVER import another service's `domain/**` schema or reach into another service's database — cross-service calls go over REST with cookie forwarding.",
      'NEVER hand-edit `stackr.config.json` to add a service — run `stackr add service <name>` so `docker-compose.yml` and each `backend/package.json` stay in sync.',
    ],
    architectureProse:
      'The `auth` service is the trust anchor for the whole monorepo. Non-auth services own only their own domain tables; they never own `user`/`session` tables. They verify a request by forwarding its httpOnly cookie to `${AUTH_SERVICE_URL}/api/auth/get-session`, getting back the user/session that decorates `request.user`. Each service owns an isolated Postgres + Redis, so blast radius is bounded and schemas evolve independently — the cost is duplicated infra, which the root docker-compose + `setup` script absorb.',
    lintRuleIds: ['no-auth-tables-outside-auth', 'repo-catch-database-error'],
  },

  // ===========================================================================
  // Backend subsystem — folds into <service>/backend/AGENTS.md.
  // ===========================================================================
  {
    id: 'backend-domain',
    scope: 'folder',
    kind: 'both',
    subsystem: 'backend',
    triggerGlobs: ['**/backend/domain/**/*.ts'],
    ruleSummary: [
      'Every repository DB operation MUST sit in its own try/catch that throws `ErrorFactory.databaseError({ operation, ...context, originalError })` — never let a raw DB error escape.',
      '`schema.ts` MUST export BOTH `export const XSchema = Type.Object({ ... })` AND `export type X = Static<typeof XSchema>`.',
      'NEVER `throw new Error(...)` — use an `ErrorFactory` method (`databaseError`, `resourceNotFound`, `validationFailed`, …).',
      'Repositories do pure DB work (`find*`/`insert*`/`update*`/`delete*`); token/expiry/multi-step logic and external calls belong in `service.ts`, which routes call instead of the repository.',
    ],
    architectureProse:
      'The backend is layered routes → service → repository → schema. Repositories perform pure DB operations, each wrapped in an isolated try/catch that throws `ErrorFactory.databaseError`; services orchestrate business logic and external calls and let repository errors propagate; schemas export a TypeBox const plus its `Static<>` type. Add a `service.ts` only for token/id generation, validation/expiry logic, multi-step operations, or external calls — simple CRUD goes straight from the route to the repository.',
    lintRuleIds: ['repo-catch-database-error'],
  },
  {
    id: 'backend-routes',
    scope: 'folder',
    kind: 'both',
    subsystem: 'backend',
    triggerGlobs: ['**/backend/controllers/rest-api/routes/**/*.ts'],
    ruleSummary: [
      'NEVER use try/catch in a route handler — let errors propagate to the error-handler plugin that normalizes them to `AppError`.',
      'Keep handlers thin: validate via the imported TypeBox schema, call the domain service/repository, return. NEVER inline a `Type.Object(...)` schema — import it from `domain/<entity>/schema.ts`.',
      'Guard protected routes with the `onRequest: server.requireAuth` hook, never an auth check in the handler body.',
    ],
  },
  {
    id: 'backend-plugins',
    scope: 'folder',
    kind: 'both',
    subsystem: 'backend',
    triggerGlobs: ['**/backend/controllers/rest-api/plugins/**/*.ts'],
    ruleSummary: [
      'Every Fastify plugin MUST be wrapped in `fp(...)` (fastify-plugin) so its decorators escape Fastify encapsulation.',
      'Plugins boot in order: config → error-handler → cors → auth → redis → routes.',
    ],
  },
  {
    id: 'backend-utils',
    scope: 'folder',
    kind: 'both',
    subsystem: 'backend',
    triggerGlobs: ['**/backend/utils/**/*.ts'],
    ruleSummary: [
      'NEVER construct a `new Pool()` or a second `PrismaClient` — import the singleton `db` client from `utils/db`.',
      'Create all errors through `ErrorFactory` (→ `AppError`); never `throw new Error(...)`.',
    ],
  },
  {
    id: 'backend-tests',
    scope: 'folder',
    kind: 'both',
    subsystem: 'backend',
    triggerGlobs: ['**/backend/tests/**/*.test.ts'],
    ruleSummary: [
      'Arrange test data inline with `uniqueEmail()` / `getShortUnique()` — NO shared fixtures or factory files.',
      'NEVER truncate tables or roll back between tests; there is no per-test cleanup. Assert resulting state through the public API, not direct DB reads.',
      'Mock only external HTTP at the network edge with `nock`; run Postgres, Redis, and BullMQ for real. Never mock your own repositories or services.',
    ],
  },

  // ===========================================================================
  // Web subsystem — folds into <service>/web/AGENTS.md (web services only).
  // ===========================================================================
  {
    id: 'web-app',
    scope: 'folder',
    kind: 'both',
    subsystem: 'web',
    triggerGlobs: ['**/web/src/app/**/*.tsx', '**/web/src/components/**/*.tsx'],
    ruleSummary: [
      "Default to Server Components; add `'use client'` only for state, hooks, interactivity, or browser APIs.",
      'Read the session in a Server Component via `getSession()`; redirect server-side when it is absent.',
    ],
    architectureProse:
      'The web app is Next.js App Router with Server Components as the default. A BFF layer proxies the Fastify backend through Server Actions that also manage the session cookie. The session model is dual: a server-side session read via `getSession()` (wrapped in `React.cache()` for per-request dedup) and a client-side device/UI session in Zustand. Server mutations call `updateTag()` for immediate read-your-own-writes; Zustand holds only client-side state.',
  },
  {
    id: 'web-lib-auth',
    scope: 'folder',
    kind: 'both',
    subsystem: 'web',
    triggerGlobs: ['**/web/src/lib/**/*.ts'],
    ruleSummary: [
      "`session.ts` MUST `import 'server-only'` and wrap `getSession()` in `React.cache()`; it is a memoized helper, NOT a Server Action.",
      "`actions.ts` MUST start with `'use server'`; after a successful mutation call `updateTag(tag)` — avoid `revalidateTag(tag, 'max')`, which leaves stale data.",
    ],
  },
  {
    id: 'web-store',
    scope: 'folder',
    kind: 'both',
    subsystem: 'web',
    triggerGlobs: ['**/web/src/store/**/*.ts'],
    ruleSummary: [
      'Zustand selector hooks MUST use `useShallow` (from `zustand/react/shallow`) for React 19 compatibility.',
      'Keep one domain per store (device session, UI state, …); never merge unrelated domains into one store.',
    ],
  },

  // ===========================================================================
  // Mobile subsystem — folds into <service>/mobile/AGENTS.md (mobile services
  // only). Enforcement here ships at `warning` severity (see ai-context.ts):
  // the shipped UI primitives legitimately hold palette hex and a non-native
  // borderColor animation, so these rules are heuristics until tuned.
  // ===========================================================================
  {
    id: 'mobile-components',
    scope: 'folder',
    kind: 'both',
    subsystem: 'mobile',
    triggerGlobs: ['**/mobile/src/components/**/*.tsx', '**/mobile/src/context/**/*.tsx'],
    axes: { platform: 'mobile' },
    ruleSummary: [
      'NEVER hardcode colors, spacing, or radii — read them from `theme.colors.*` / `theme.spacing[]` / `theme.borderRadius.*` via `useAppTheme()`.',
      'Memoize styles with `const styles = useMemo(() => createStyles(theme), [theme])` and build them with `StyleSheet.create` — never inline style objects with literal values.',
      '`Animated.timing` / `Animated.spring` MUST set `useNativeDriver: true` (except when animating non-layout props like `borderColor`).',
    ],
    architectureProse:
      'Mobile theming is centralized: `AppTheme` is created from `Theme.ts` and injected via React context. Components reference `theme.colors.*`, `theme.spacing[]`, and `theme.borderRadius.*` through `useAppTheme()` — never hardcoded values — and memoize their `StyleSheet.create` output with `useMemo(() => createStyles(theme), [theme])`. `Animated` values set `useNativeDriver: true` so they run off the JS thread.',
    // Enforced subset (ast-grep, validated clean on a pristine tree): no missing
    // useNativeDriver, no hardcoded hex (rgba + the QR-scanability white + the
    // feature-gated paywall are documented exceptions), and no raw fetch() in
    // presentation code. See the renderers in ai-context.ts.
    lintRuleIds: [
      'mobile-animated-native-driver',
      'mobile-no-hardcoded-color',
      'mobile-no-direct-fetch',
    ],
  },
  {
    id: 'mobile-services',
    scope: 'folder',
    kind: 'both',
    subsystem: 'mobile',
    triggerGlobs: ['**/mobile/src/services/**/*.ts', '**/mobile/src/lib/**/*.ts'],
    axes: { platform: 'mobile' },
    ruleSummary: [
      'All HTTP goes through the shared `api` axios instance (`services/api.ts`) — NEVER call `fetch()` directly or spin up a second axios/auth client.',
      'Store auth tokens and session data in `expo-secure-store` (`SecureStore`), not `AsyncStorage`.',
      'Implement services as `getInstance()` singletons; stores call services, never the reverse.',
    ],
  },
];

/**
 * Project-scope rules — applied to every project regardless of service shape.
 */
export function selectProjectRules(): ContextRule[] {
  return CONTEXT_RULES.filter((r) => r.scope === 'project');
}

/** The axes a service exposes for rule selection. Pulled straight off a built
 *  `ServiceRenderContext` — never re-derived from raw `ServiceConfig`. */
export interface ServiceRuleAxes {
  kind: 'auth' | 'base';
  /** From `ctx.platforms`. */
  platforms: Platform[];
  /** From `ctx.orm`. */
  orm: ORMChoice;
}

/**
 * Folder/service-scope rules that apply to a single service. Filters by:
 * - `kind` (`'both'` or the service's own kind),
 * - subsystem availability (backend always; web/mobile only when the service
 *   ships that platform),
 * - any set `axes` (e.g. `orm`, `platform`).
 *
 * Returned in declaration order so the rendered `AGENTS.md` is stable.
 */
export function selectServiceRules(axes: ServiceRuleAxes): ContextRule[] {
  return CONTEXT_RULES.filter((rule) => {
    if (rule.scope === 'project') return false;
    if (rule.kind !== 'both' && rule.kind !== axes.kind) return false;

    if (rule.subsystem === 'web' && !axes.platforms.includes('web')) return false;
    if (rule.subsystem === 'mobile' && !axes.platforms.includes('mobile')) return false;

    if (rule.axes?.orm && rule.axes.orm !== axes.orm) return false;
    if (rule.axes?.platform && !axes.platforms.includes(rule.axes.platform)) return false;

    return true;
  });
}

/** Rules for one subsystem of a service (used to render each subsystem's
 *  `AGENTS.md`). */
export function rulesForSubsystem(rules: ContextRule[], subsystem: Subsystem): ContextRule[] {
  return rules.filter((r) => r.subsystem === subsystem);
}

/** Which subsystems a service actually ships (drives which nested `AGENTS.md`
 *  files are emitted). */
export function subsystemsForService(axes: ServiceRuleAxes): Subsystem[] {
  const out: Subsystem[] = ['backend'];
  if (axes.platforms.includes('web')) out.push('web');
  if (axes.platforms.includes('mobile')) out.push('mobile');
  return out;
}
