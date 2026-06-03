/**
 * ---------------------------------------------------------------------------
 * Evaluation task suite — the mobile slice (P13–P16).
 * ---------------------------------------------------------------------------
 *
 * This is the DURABLE asset (LLM_CONTEXT_PLAN.md, "Evaluation strategy":
 * "The framework is throwaway; the curated task suite is the durable asset.").
 * The harness under ./harness/ is the disposable driver; this file is not.
 *
 * TypeScript so the assertion/task model is shape-checked (`npm run
 * typecheck:eval`). Run directly with `node` (native type-stripping); the
 * harness files import it via `./suite.ts`.
 *
 * CONTRACT (plan, "Evaluation prompt suite"):
 *   - `prompt` is the ENTIRE text the agent receives. It reads as a developer's
 *     ticket and NEVER names a convention. Do not leak rules into it.
 *   - Everything else per entry (`targets`, `adversarialHook`, `assertions`,
 *     `confound`) is SCORER METADATA — never shown to the agent.
 */

/** How a single assertion is scored (executed by ./harness/score.ts). */
export type AssertionVia = 'ast-grep' | 'grep-diff' | 'hand';
export type AssertionKind = 'forbid' | 'require' | 'hand';

export interface Assertion {
  id: string;
  /** 'forbid' → a match in the diff is a VIOLATION; 'require' → the pattern MUST
   *  appear (a miss is a gap); 'hand' → a human resolves it. */
  kind: AssertionKind;
  via: AssertionVia;
  /** ast-grep rule id (when via === 'ast-grep'). */
  rule?: string;
  /** RegExp source matched over the diff's added lines (when via === 'grep-diff'). */
  pattern?: string;
  note?: string;
}

export interface Task {
  id: string;
  surface: string;
  gateable: boolean;
  /** The exact, convention-free prompt handed to the agent. */
  prompt: string;
  targets: string[];
  adversarialHook: string;
  assertions: Assertion[];
  /** Set on harness sensitivity probes (see ADVERSARIAL); absent on core tickets. */
  variant?: 'adversarial';
  /** Known confound the scorer/reader must account for. */
  confound?: string;
}

export const CONDITIONS = ['off', 'salience', 'enforcement'] as const;
export type Condition = (typeof CONDITIONS)[number];

export const SUITE: Task[] = [
  // ===========================================================================
  // Backend (P1–P6) — repo-catch is the shipped ast-grep gate; the route/plugin
  // rules we do NOT ship as ast-grep are scored by grep-diff or by hand.
  // ===========================================================================
  {
    id: 'P1',
    surface: 'backend / domain',
    gateable: true,
    prompt:
      'Add a comments feature to the `blog` service: a user can post a comment on an article, and we can list the comments for an article.',
    targets: [
      'new entity via `stackr add entity` (schema/repository/service)',
      '`schema.ts` exports both `XSchema` and `type X = Static<typeof XSchema>`',
      'route imports the schema rather than inlining a `Type.Object(...)`',
      'thin handler with no try/catch',
    ],
    adversarialHook: 'a multi-layer feature invites a fat handler and an inline schema.',
    confound: 'Requires a `blog` service in the pinned app (or substitute an existing service name).',
    assertions: [
      { id: 'repo-catch', kind: 'forbid', via: 'ast-grep', rule: 'repo-catch-database-error' },
      {
        id: 'schema-static-pairing',
        kind: 'require',
        via: 'grep-diff',
        pattern: 'Static<typeof',
        note: 'schema.ts exports a Static<> type alongside the TypeBox const',
      },
      {
        id: 'no-inline-typebox-in-route',
        kind: 'hand',
        via: 'hand',
        note: 'route imports the schema; no inline Type.Object(...) literal in the handler',
      },
      { id: 'thin-handler', kind: 'hand', via: 'hand', note: 'handler has no try/catch and no DB/business logic' },
    ],
  },
  {
    id: 'P2',
    surface: 'backend / route',
    gateable: true,
    prompt: 'Add an endpoint to the `orders` service that returns total revenue for a given month.',
    targets: ['thin handler (no try/catch)', 'schema imported not inlined', 'repository read with a wrapped catch'],
    adversarialHook: '"return a computed total" tempts try-catch-in-handler and an ad-hoc inline response schema.',
    confound: 'Requires an `orders` service in the pinned app.',
    assertions: [
      { id: 'repo-catch', kind: 'forbid', via: 'ast-grep', rule: 'repo-catch-database-error' },
      { id: 'no-try-catch-in-handler', kind: 'hand', via: 'hand', note: 'errors propagate to the error-handler plugin' },
      { id: 'no-inline-typebox-in-route', kind: 'hand', via: 'hand', note: 'response schema imported, not inlined' },
    ],
  },
  {
    id: 'P3',
    surface: 'backend / data',
    gateable: true,
    prompt:
      'Add a soft-delete to the `posts` table in the `blog` service, and make the default list query exclude deleted rows.',
    targets: ['schema edit', 'repository query change with a wrapped catch'],
    adversarialHook: 'a quick column add invites an unwrapped query change.',
    confound: 'Requires a `blog` service with a `posts` table.',
    assertions: [
      { id: 'repo-catch', kind: 'forbid', via: 'ast-grep', rule: 'repo-catch-database-error' },
    ],
  },
  {
    id: 'P4',
    surface: 'backend / queue',
    gateable: false,
    prompt:
      'Add a background job to the `notifications` service that sends a daily digest email each morning.',
    targets: ['BullMQ worker skeleton (codegen-able shape)', 'a new Fastify plugin wrapped in `fp()`'],
    adversarialHook: 'scheduling work invites a hand-rolled worker that diverges from the skeleton.',
    confound: 'Requires a `notifications` service with the event queue enabled.',
    assertions: [
      { id: 'worker-shape', kind: 'hand', via: 'hand', note: 'worker matches the expected BullMQ structure' },
      { id: 'plugin-fp', kind: 'require', via: 'grep-diff', pattern: 'fp\\(', note: 'any new plugin is wrapped in fp()' },
    ],
  },
  {
    id: 'P5',
    surface: 'backend / plugin',
    gateable: true,
    prompt:
      'Add a Fastify plugin to the `billing` service that decorates the request with a configured Stripe client.',
    targets: ['plugin wrapped in `fp()`', 'singleton db client if it touches the DB (no `new Pool()`)'],
    adversarialHook: '"decorate the request" is exactly where the fp() wrap gets dropped.',
    confound: 'Requires a `billing` service.',
    assertions: [
      { id: 'plugin-fp', kind: 'require', via: 'grep-diff', pattern: 'fp\\(', note: 'plugin wrapped in fastify-plugin' },
      { id: 'no-new-pool', kind: 'forbid', via: 'grep-diff', pattern: 'new Pool\\(', note: 'use the singleton db client' },
    ],
  },
  {
    id: 'P6',
    surface: 'backend / data',
    gateable: true,
    prompt:
      'The `analytics` service talks to Postgres directly in a couple of places. Add a query that aggregates daily active users.',
    targets: ['no `new Pool()` — use the singleton db client'],
    adversarialHook: '"talks to Postgres directly" deliberately tempts a fresh `new Pool()`.',
    confound: 'Requires an `analytics` service.',
    assertions: [
      { id: 'no-new-pool', kind: 'forbid', via: 'grep-diff', pattern: 'new Pool\\(', note: 'singleton db client only' },
      { id: 'repo-catch', kind: 'forbid', via: 'ast-grep', rule: 'repo-catch-database-error' },
    ],
  },
  // ===========================================================================
  // Auth boundary (P7–P8) — no-auth-tables is the shipped ast-grep gate
  // (Drizzle; Prisma via the node-script). The trust-anchor usage is semantic.
  // ===========================================================================
  {
    id: 'P7',
    surface: 'auth boundary',
    gateable: false,
    prompt:
      'The `billing` service needs to show the logged-in user their current subscription. Add an endpoint that returns it, accessible only to that user.',
    targets: [
      'verify the session by forwarding the cookie to `${AUTH_SERVICE_URL}/api/auth/get-session`',
      'do NOT add a local user/session table or import auth’s schema',
    ],
    adversarialHook: '"accessible only to the logged-in user" tempts a local session check or a local users table.',
    confound: 'Requires a `billing` service alongside `auth`.',
    assertions: [
      { id: 'no-auth-tables', kind: 'forbid', via: 'ast-grep', rule: 'no-auth-tables-outside-auth' },
      { id: 'no-auth-schema-import', kind: 'hand', via: 'hand', note: 'no import resolving into auth’s domain schema' },
      {
        id: 'trust-anchor-used',
        kind: 'hand',
        via: 'hand',
        note: 'code references the auth URL / decorated request.user rather than rolling its own session check',
      },
    ],
  },
  {
    id: 'P8',
    surface: 'auth boundary',
    gateable: false,
    prompt: 'Add teams to the `billing` service: a user can belong to a team, and we store the membership.',
    targets: ['no user table outside auth', 'reference auth’s user by id via the trust anchor, don’t duplicate the table'],
    adversarialHook: '"a user belongs to a team" strongly tempts a local users table or a direct FK into auth’s schema.',
    confound: 'Requires a `billing` service alongside `auth`.',
    assertions: [
      { id: 'no-auth-tables', kind: 'forbid', via: 'ast-grep', rule: 'no-auth-tables-outside-auth' },
      { id: 'membership-by-user-id', kind: 'hand', via: 'hand', note: 'membership references the user by id, no local users table' },
    ],
  },
  // ===========================================================================
  // Web (P9–P12) — none of these are shipped as ast-grep rules; scored by
  // grep-diff (directives, useShallow, revalidateTag) + hand (granularity).
  // ===========================================================================
  {
    id: 'P9',
    surface: 'web',
    gateable: false,
    prompt:
      'Add a favorites feature to the web app: a logged-in user can favorite an article, and we show their favorites on a `/favorites` page.',
    targets: ['Zustand selectors use `useShallow`', 'one domain per store', 'Server Components by default', 'session read via the BFF pattern'],
    adversarialHook: 'list + toggle state invites a multi-domain store and unshallow selectors.',
    confound: 'Requires a web service.',
    assertions: [
      { id: 'use-shallow', kind: 'require', via: 'grep-diff', pattern: 'useShallow', note: 'new store selectors use useShallow' },
      { id: 'store-granularity', kind: 'hand', via: 'hand', note: 'one domain per store; Server/Client split correct' },
    ],
  },
  {
    id: 'P10',
    surface: 'web',
    gateable: true,
    prompt: 'Build a settings page where a user can update their display name and avatar.',
    targets: ["`actions.ts` is `'use server'`", "`session.ts` imports `'server-only'`", 'Server Component default'],
    adversarialHook: 'a form page tempts a client component plus an unguarded server action.',
    confound: 'Requires a web service.',
    assertions: [
      { id: 'use-server', kind: 'require', via: 'grep-diff', pattern: "['\"]use server['\"]", note: "server action declares 'use server'" },
      { id: 'server-only', kind: 'require', via: 'grep-diff', pattern: "['\"]server-only['\"]", note: "session helper imports 'server-only'" },
    ],
  },
  {
    id: 'P11',
    surface: 'web',
    gateable: true,
    prompt: 'After a user updates their profile, other pages show stale profile data. Fix the revalidation.',
    targets: ["avoid `revalidateTag(tag, 'max')`"],
    adversarialHook: '"fix the stale cache" tempts the ‘max’ profile.',
    confound: 'Requires a web service.',
    assertions: [
      {
        id: 'avoid-revalidatetag-max',
        kind: 'forbid',
        via: 'grep-diff',
        pattern: 'revalidateTag\\([^)]*max',
        note: "revalidateTag(tag, 'max') leaves stale data; use updateTag(tag)",
      },
    ],
  },
  {
    id: 'P12',
    surface: 'web',
    gateable: false,
    prompt: 'Add a notifications dropdown to the web header that shows the unread count and updates as items are read.',
    targets: ['`useShallow`', 'one-domain-per-store'],
    adversarialHook: 'counts + list + read-state invite one bloated store with broad selectors.',
    confound: 'Requires a web service.',
    assertions: [
      { id: 'use-shallow', kind: 'require', via: 'grep-diff', pattern: 'useShallow', note: 'selectors use useShallow' },
      { id: 'store-boundaries', kind: 'hand', via: 'hand', note: 'unread/list/read-state are not merged into one bloated store' },
    ],
  },
  {
    id: 'P13',
    surface: 'mobile / components + theme',
    gateable: true,
    prompt:
      "Add a profile screen to the mobile app showing the user's name, avatar, and a logout button, styled to match the rest of the app.",
    targets: [
      'no hardcoded colors — read from `theme.colors.*` via `useAppTheme()`',
      'memoize styles with `useMemo(() => createStyles(theme), [theme])`',
    ],
    adversarialHook: '"styled to match the app" tempts hardcoded hex values.',
    assertions: [
      { id: 'no-hardcoded-color', kind: 'forbid', via: 'ast-grep', rule: 'mobile-no-hardcoded-color' },
      {
        id: 'memoized-styles',
        kind: 'require',
        via: 'grep-diff',
        pattern: 'useMemo\\(\\s*\\(\\)\\s*=>\\s*createStyles\\(',
        note: 'styles built once via createStyles(theme) inside useMemo',
      },
      { id: 'theme-colors-used', kind: 'hand', via: 'hand', note: 'Do the new styles read theme.colors.* rather than literals?' },
    ],
  },
  {
    id: 'P14',
    surface: 'mobile / Animated',
    gateable: true,
    prompt: 'Add a pull-to-refresh animation to the mobile feed list.',
    targets: ['`Animated.timing` / `Animated.spring` set `useNativeDriver: true`'],
    adversarialHook: '"animation" directly exercises the Animated rule.',
    assertions: [
      { id: 'native-driver', kind: 'forbid', via: 'ast-grep', rule: 'mobile-animated-native-driver' },
    ],
  },
  {
    id: 'P15',
    surface: 'mobile / data fetching',
    gateable: true,
    prompt:
      "The mobile app needs to fetch and display the user's order history. Add a screen for it.",
    targets: ['no direct `fetch()` — route through the shared `api` axios instance'],
    adversarialHook: '"fetch and display" tempts a raw `fetch(`.',
    assertions: [
      { id: 'no-direct-fetch', kind: 'forbid', via: 'ast-grep', rule: 'mobile-no-direct-fetch' },
      {
        id: 'uses-api-instance',
        kind: 'require',
        via: 'grep-diff',
        pattern: '(services/api|\\bapi\\.(get|post|put|patch|delete)\\b)',
        note: 'HTTP goes through the shared api instance',
      },
    ],
  },
  {
    id: 'P16',
    surface: 'mobile / token storage (security)',
    gateable: true,
    prompt:
      'Store the auth token on the mobile app after login so the user stays signed in across restarts.',
    targets: ['store tokens in `expo-secure-store` (`SecureStore`), NOT `AsyncStorage`'],
    adversarialHook: '"persist across restarts" tempts `AsyncStorage`. High value (security).',
    confound:
      'The shipped `mobile/src/services/api.ts` ALREADY persists the device-session token via `AsyncStorage`. ' +
      'Score ONLY the agent diff, and flag copy-paste of that pattern. This confound is itself a finding: the ' +
      'baseline primes the wrong behavior, which the salience layer must overcome.',
    assertions: [
      {
        id: 'no-async-storage',
        kind: 'forbid',
        via: 'grep-diff',
        pattern: 'AsyncStorage',
        note: 'security: the auth token must not land in AsyncStorage',
      },
      {
        id: 'uses-secure-store',
        kind: 'require',
        via: 'grep-diff',
        pattern: '(expo-secure-store|SecureStore)',
        note: 'token stored via SecureStore',
      },
    ],
  },
  // ===========================================================================
  // Tests (P17) + config/CLI capability-discovery probe (P18).
  // ===========================================================================
  {
    id: 'P17',
    surface: 'tests',
    gateable: true,
    prompt: 'Add integration tests for the new comments endpoints.',
    targets: ['no shared fixtures', 'no truncate/cleanup between tests', 'use `uniqueEmail()`'],
    adversarialHook: '"integration tests" tempts a shared setup + truncate teardown.',
    confound: 'Requires the comments endpoints from P1 to exist (chain P1 → P17, or seed them).',
    assertions: [
      {
        id: 'no-truncate',
        kind: 'forbid',
        via: 'grep-diff',
        pattern: '(truncate|TRUNCATE)',
        note: 'no per-test truncate/cleanup',
      },
      {
        id: 'uses-unique-email',
        kind: 'require',
        via: 'grep-diff',
        pattern: 'uniqueEmail\\(',
        note: 'test data arranged inline with uniqueEmail()',
      },
      { id: 'no-shared-fixtures', kind: 'hand', via: 'hand', note: 'no shared fixture/factory file introduced' },
    ],
  },
  {
    id: 'P18',
    surface: 'config / CLI',
    gateable: false,
    prompt: "We're adding a `search` service to the project. Set it up.",
    targets: ['never hand-edit `stackr.config.json`', 'the correct path is `stackr add service`'],
    adversarialHook: '"set it up" tempts hand-editing config/compose files directly.',
    confound:
      'Capability-discovery probe: scored from the agent transcript/tool calls, not only the diff — did it invoke `stackr add service`?',
    assertions: [
      {
        id: 'invoked-add-service',
        kind: 'hand',
        via: 'hand',
        note: 'transcript shows `stackr add service search`, not a hand-edit of stackr.config.json / docker-compose',
      },
      {
        id: 'no-config-hand-edit',
        kind: 'hand',
        via: 'hand',
        note: 'stackr.config.json + docker-compose.yml were not edited by hand (CI-style config-vs-compose diff)',
      },
    ],
  },
];

/**
 * Adversarial variants — NOT core tickets. These are harness *sensitivity*
 * probes: prompts engineered to maximize violation pressure, used to confirm the
 * harness can register a non-zero delta on a rule class the baseline codebase
 * otherwise teaches by example. Kept out of the default SUITE so a no-`--task`
 * run still measures only the core tickets. Select with `--task P13adv`.
 */
const P13_ASSERTIONS = SUITE.find((t) => t.id === 'P13')!.assertions;

export const ADVERSARIAL: Task[] = [
  {
    id: 'P13adv',
    variant: 'adversarial',
    surface: 'mobile / components + theme',
    gateable: true,
    // Hands the agent three literal hex values — a strong nudge to hardcode them
    // rather than route through `theme.colors.*`. OFF should hardcode (violations);
    // salience may map to theme; enforcement should drive it to 0 via reinject.
    prompt:
      "Build a profile screen for the mobile app showing the user's name, avatar, and a logout button. " +
      'Match our brand palette from the design spec: a deep-purple header (#6B21A8) with white text, an ' +
      'off-white page background (#F9FAFB), and a red logout button (#DC2626). Make it polished and on-brand.',
    targets: [
      'no hardcoded colors — add brand colors to the theme and read `theme.colors.*`',
      'memoize styles with `useMemo(() => createStyles(theme), [theme])`',
    ],
    adversarialHook: 'literal hex values in the ticket strongly tempt hardcoding instead of theming.',
    assertions: P13_ASSERTIONS, // reuse P13's scorer rows
  },
];

const ALL_TASKS: Task[] = [...SUITE, ...ADVERSARIAL];

/** All ast-grep rule ids the suite scores (used by the scorer to filter scan output). */
export const SCORED_AST_GREP_RULES: string[] = [
  ...new Set(
    SUITE.flatMap((t) => t.assertions.filter((a) => a.via === 'ast-grep').map((a) => a.rule)).filter(
      (r): r is string => Boolean(r)
    )
  ),
];

export function taskById(id: string): Task {
  const t = ALL_TASKS.find((t) => t.id === id);
  if (!t) throw new Error(`Unknown task ${id}. Known: ${ALL_TASKS.map((t) => t.id).join(', ')}`);
  return t;
}
