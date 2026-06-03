/**
 * Harness knobs. Everything tunable lives here. THROWAWAY (see ../README.md).
 *
 * Override any of these via environment variables of the same name.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
const EVAL_DIR = path.resolve(HARNESS_DIR, '..'); // eval
const REPO_ROOT = path.resolve(EVAL_DIR, '..'); // repo root

const env = (k: string, d: string): string => process.env[k] ?? d;
const num = (k: string, d: number): number => (process.env[k] ? Number(process.env[k]) : d);

const WORKDIR = env('EVAL_WORKDIR', path.join(EVAL_DIR, '.work'));

export const config = {
  HARNESS_DIR,
  EVAL_DIR,
  REPO_ROOT,

  /** Disposable working tree (gitignored). */
  WORKDIR,
  /** The generated app under test. */
  APP_DIR: path.join(WORKDIR, 'app'),
  /** Condition-independent copy of the enforcement rules used by the scorer.
   *  Snapshotted at generation time, BEFORE any condition strips them. */
  SCORER_DIR: path.join(WORKDIR, 'scorer-config'),
  RESULTS_DIR: path.join(WORKDIR, 'results'),

  /** Runs per condition per task. Agent runs are nondeterministic — this is a
   *  rate, not a single sample; 10 is a reasonable floor-to-5 default. */
  RUNS_PER_CONDITION: num('EVAL_RUNS', 10),

  /** The conditions to run, in order. */
  CONDITIONS: env('EVAL_CONDITIONS', 'off,salience,enforcement').split(',').map((s) => s.trim()),

  /**
   * Command that drives the coding agent over ONE task. Receives the prompt on
   * stdin and runs with cwd = the generated app dir. Must edit files in-place
   * and exit when done. Leave empty to run the harness in --dry-run plumbing
   * mode (no agent, scores an empty diff = 0 violations).
   *
   * VERIFIED invocation (claude 2.1.160) — reads the prompt from stdin with `-p`
   * and no positional arg, edits files in cwd, and fires the project's PostToolUse
   * hook (so the enforcement condition's reinject loop runs):
   *
   *   EVAL_AGENT_CMD='claude -p --dangerously-skip-permissions'
   *
   * `--dangerously-skip-permissions` is required headless (no TTY to approve
   * edits). Re-verify the flag set if your `claude` version differs.
   */
  AGENT_CMD: env('EVAL_AGENT_CMD', ''),

  /** Per-agent-run wall-clock cap (ms). */
  AGENT_TIMEOUT_MS: num('EVAL_AGENT_TIMEOUT_MS', 15 * 60 * 1000),

  /**
   * Optional per-run MODEL sweep. When set (e.g. EVAL_MODELS='haiku,sonnet,opus')
   * run index i uses MODELS[i % MODELS.length], appending `--model <id>` to the
   * agent command — so 3 runs × 3 models gives one (condition × model) cell each.
   * Empty → single model (whatever AGENT_CMD defaults to). With a sweep, n=1 per
   * cell, so results are a MODEL COMPARISON probe, directional only.
   */
  MODELS: env('EVAL_MODELS', '').split(',').map((s) => s.trim()).filter(Boolean),

  /** ORM for the generated app. 'drizzle' so the no-auth-tables ast-grep rule
   *  also emits (mobile rules are ORM-independent). */
  ORM: env('EVAL_ORM', 'drizzle'),
};

/** Friendly aliases → exact model IDs (the claude CLI also accepts the aliases,
 *  but we resolve to IDs so results record exactly which model ran). */
export const MODEL_ALIASES: Record<string, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
  opus: 'claude-opus-4-8',
};

export const resolveModel = (m: string): string => MODEL_ALIASES[m] ?? m;

export const CONDITION_LABELS: Record<string, string> = {
  off: 'OFF (context stripped, no hook) — baseline',
  salience: 'Salience-only (context present, no reinject hook)',
  enforcement: 'Salience + enforcement (context present + mobile ast-grep PostToolUse hook)',
};
