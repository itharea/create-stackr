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
