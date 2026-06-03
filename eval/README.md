# Agent-context effectiveness eval (mobile slice)

A stackr-generated project ships several layers meant to make an AI coding agent
follow the project's conventions: nested `AGENTS.md` files, `CLAUDE.md`, Cursor/
Windsurf rule files (**salience** — getting the right rule in front of the agent),
plus ast-grep rules and a PostToolUse hook (**enforcement** — catching violations
and feeding them back for self-repair).

This suite measures **how much those layers actually change an agent's first-pass
compliance**, on the mobile rule class (theming, animation, data-fetching, secure
token storage — tickets **P13–P16**). It runs each task under three conditions and
scores the agent's diff with the project's own ast-grep rules, so the numbers are
objective rather than vibes.

The **task suite (`suite.ts`) is the durable asset**; the `harness/` driver is a
throwaway rig you point at a generated app.

## Purpose

- **Quantify the lift** each layer gives — and where it runs out. Salience raises
  first-pass compliance only probabilistically; the enforcement loop backstops it
  but only for mechanically-checkable rules.
- **Separate the two effects.** `OFF → salience` is "does push delivery help, and
  how much." `salience → enforcement` is "does the check-and-reinject loop add
  reliability on top." Running only ON-vs-OFF can't tell them apart.
- **Locate the next investment.** A per-violation cause label says whether a miss
  was because the rule wasn't delivered (spend on salience) or was delivered and
  ignored (spend on a gate/codegen).

## Two findings baked into the harness (read first)

1. **A stackr project's reinject hook does not cover mobile.** The generated
   PostToolUse hook (`.claude/hooks/check-edited.mjs`) runs ESLint against the
   nearest **backend** `eslint.config.mjs`. The mobile subsystem ships `expo lint`
   with no flat ESLint config, so that hook **no-ops on every mobile edit** — the
   three mobile ast-grep rules only gate at `lint:sg`/CI, never at edit-time. So
   to make the "enforcement" condition meaningful for mobile, the harness installs
   its own mobile hook (`harness/hooks/check-edited-mobile.mts`) that runs the
   mobile ast-grep rules and `exit 2`s for self-repair. **A large
   `Δ salience→enforcement` here is therefore evidence that a real mobile reinject
   hook is worth adding to the generator.**

2. **The baseline primes the wrong P16 behavior.** A generated app's
   `mobile/src/services/api.ts` persists the device-session token via
   `AsyncStorage`, while the convention says tokens belong in `SecureStore`. P16 is
   scored on the agent's diff only, but expect the existing code to tempt
   copy-paste — a signal about whether salience can overcome a contradictory
   in-repo example.

## What it does

1. Generate one pinned app (auth + a mobile-enabled `core`, drizzle, all AI tools)
   from the built generator — `harness/generate-app.ts`.
2. Snapshot `sgconfig.yml` + `.stackr/sg-rules` into `.work/scorer-config`
   **before** any condition strips them, so the scorer is condition-independent
   and never drifts from the rules the generator actually emits.
3. `git init` + tag `start`; `npm install` at the app root (pulls `@ast-grep/cli`,
   which the scorer needs).
4. For each **condition × task × run**: reset → materialize the condition → commit
   a per-run baseline → run the agent on the ticket → `git diff` (the agent's
   changes only) → score → reset to `start`.

## The three conditions

| Condition | Context files | Reinject hook | Isolates |
|---|---|---|---|
| `off` | stripped (all `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.windsurfrules`, `.claude/`, `sgconfig.yml`, `.stackr/`) | none | baseline |
| `salience` | present | none | push delivery alone |
| `enforcement` | present | **mobile ast-grep hook** | the check-and-reinject loop on top |

The **scorer is identical across all three** — it always uses the
`.work/scorer-config` snapshot, so `off` (where in-tree rules were stripped) is
scored by the same rules as the others.

## Metrics

- **gate-able violations at first edit** (primary) — ast-grep error count +
  `forbid` grep-diff hits over the agent's diff.
- **require-misses** — `require` assertions whose expected pattern never appeared
  (e.g. P15 never routed through the shared `api` instance).
- **hand assertions** — semantic checks surfaced for manual resolution (per-task
  hand-written assertions, not an LLM judge).

Report **deltas and spread**, not absolute numbers; treat everything as
**directional** (agent runs are nondeterministic), never a pass/fail gate.

## Cause labels

Each violation is labeled:
- `off` → **absent-from-context** (by construction).
- `salience` / `enforcement` → **present-but-ignored** by default (the salience
  ceiling). Hand-upgrade a row to **present-but-misapplied** when the agent
  clearly tried and got it wrong. This tells you whether the next effort buys more
  salience or a new gate.

## How to run

From the repo root:

```bash
# 0. (optional) type-check the harness
npm run typecheck:eval

# 1. Build, then generate the pinned mobile app + scorer snapshot
#    (pin the stackr commit by checking it out + rebuilding first; SHA → .work/provenance.json)
npm run build
node eval/harness/generate-app.ts

# 2. git-init + npm install the app (root deps → @ast-grep/cli for the scorer)
node eval/harness/run.ts --setup

# (optional) sanity-check the SCORER itself with planted fixtures — no agent, no tokens
node eval/harness/selftest.ts

# 3a. Plumbing check with NO agent (scores empty diffs = 0; verifies the loop cycles)
node eval/harness/run.ts --dry-run

# 3b. Real run — provide an agent command (prompt arrives on stdin, cwd = the app)
EVAL_AGENT_CMD='claude -p --dangerously-skip-permissions' \
  node eval/harness/run.ts --runs 10

# Narrow while iterating:
node eval/harness/run.ts --task P13 --runs 5 --dry-run
```

> The harness is TypeScript run directly by Node's native type-stripping (no build
> step). The hook is `.mts` because it is copied into the generated app, whose
> `package.json` is CommonJS — `.mts` stays an ES module regardless of the host.

Results land in `.work/results/mobile-result.json` (gitignored): per-cell means
+ stdev, the headline `Δ off→salience` / `Δ salience→enforcement`, and full per-run
transcripts (each assertion row + its cause label) for the manual `hand` /
`misapplied` pass.

### Knobs (`harness/config.ts`, all env-overridable)

`EVAL_RUNS` (default 10) · `EVAL_CONDITIONS` · `EVAL_AGENT_CMD` ·
`EVAL_AGENT_TIMEOUT_MS` · `EVAL_ORM` · `EVAL_WORKDIR` · `EVAL_MODELS`.

### Model sweep

Set `EVAL_MODELS=haiku,sonnet,opus` to pin run index `i` to `MODELS[i % len]`
(appends `--model <id>` to the agent command). With `--runs 3` this gives one
`(condition × model)` cell per model — a model-capability comparison, printed as a
`by model` table and stored under `byModel` in the result JSON. Note n=1/cell:
directional only, not a rate.

### Adversarial variants

`suite.ts` also exports `ADVERSARIAL` — sensitivity probes (e.g. `P13adv`) whose
prompts are engineered to maximize violation pressure (P13adv hands three literal
hex values to tempt hardcoding). They are **not** part of the default `SUITE`;
select one with `--task P13adv`. Use them to confirm the harness can register a
non-zero delta on a rule class the baseline codebase otherwise teaches by example.

```bash
# adversarial P13 across haiku/sonnet/opus, one run each per condition
EVAL_AGENT_CMD='claude -p --dangerously-skip-permissions' \
EVAL_MODELS=haiku,sonnet,opus \
  node eval/harness/run.ts --task P13adv --runs 3
```

## Interpreting the result

- **`Δ off→salience` large** → push delivery is doing real work. **Small** →
  salience is near its ceiling; the next effort is better spent on gates/codegen
  than on more prose.
- **`Δ salience→enforcement` large** → the reinject loop adds reliability salience
  can't — and since the mobile reinject hook is supplied by the harness (not the
  generator), that delta is the case for shipping a real one.
- **`require-misses` high on P15** → the agent writes working code that ignores the
  shared `api` instance — a salience problem no `forbid` gate catches.
- **P16 `AsyncStorage` violations persisting under `salience`** → the baseline
  `api.ts` example is out-shouting the rule; fix the baseline, not just the docs.

## Caveats / honest limits

- **First-edit vs full diff.** The scorer reads the full task diff. For strict
  "first edit" precision, add a PostToolUse tap that records the first edited file
  and restrict scoring to it — a documented refinement, not wired by default.
- **`tsc`-clean-first-pass** is omitted: it needs the (heavy) Expo mobile
  `node_modules`. Add it as a secondary metric once mobile deps are installed.
- **Fresh-scaffold spot-check.** The enforcement hook no-ops before deps exist. A
  small non-`--setup` pass (skip `npm install`) characterizes that no-op.
- **Automation asymmetry.** Only Claude Code automates headlessly cleanly; Cursor
  and Windsurf get a smaller manual smoke test, not an n=10 number.

## Files

```
eval/
├── README.md             # this doc
├── suite.ts              # P13–P16 tickets + scorer metadata (durable asset)
├── tsconfig.json         # type-checks the harness (noEmit); npm run typecheck:eval
├── .gitignore            # ignores .work/
└── harness/              # throwaway driver
    ├── config.ts         # knobs
    ├── lib.ts            # git / diff / ast-grep / condition materialization
    ├── generate-app.ts   # generate the pinned mobile app + scorer snapshot (imports dist/)
    ├── score.ts          # run checkers on the diff → violations + cause labels
    ├── run.ts            # orchestrator: conditions × tasks × N runs → deltas
    ├── selftest.ts       # plants known-bad fixtures, asserts the scorer flags them
    └── hooks/
        ├── settings.json              # PostToolUse → the mobile hook
        └── check-edited-mobile.mts    # the mobile reinject loop (.mts = ESM in the CJS app)
```
