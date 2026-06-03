/**
 * Shared helpers for the harness: shell, git, diff parsing, ast-grep, and
 * condition materialization. THROWAWAY.
 */
import { spawnSync, type SpawnSyncOptions } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

export interface ShResult {
  code: number;
  out: string;
  raw: ReturnType<typeof spawnSync>;
}

// ---------------------------------------------------------------------------
// process
// ---------------------------------------------------------------------------

export function sh(cmd: string, args: string[], opts: SpawnSyncOptions = {}): ShResult {
  const res = spawnSync(cmd, args, { encoding: 'utf8', ...opts });
  return { code: res.status ?? -1, out: `${res.stdout ?? ''}${res.stderr ?? ''}`, raw: res };
}

// ---------------------------------------------------------------------------
// git — every run starts from a pristine `start` ref and is reset back to it.
// ---------------------------------------------------------------------------

const GIT_ENV: NodeJS.ProcessEnv = {
  ...process.env,
  GIT_AUTHOR_NAME: 'eval',
  GIT_AUTHOR_EMAIL: 'eval@stackr.local',
  GIT_COMMITTER_NAME: 'eval',
  GIT_COMMITTER_EMAIL: 'eval@stackr.local',
};

export function git(dir: string, args: string[]): ShResult {
  return sh('git', args, { cwd: dir, env: GIT_ENV });
}

/** Init the app as a git repo (if needed) and tag the pristine tree `start`. */
export function gitInitStart(dir: string): void {
  if (!fs.existsSync(path.join(dir, '.git'))) git(dir, ['init', '-q']);
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '--no-verify', '-m', 'pristine generated app', '--allow-empty']);
  git(dir, ['tag', '-f', 'start']);
}

/** Restore the pristine tree. */
export function resetToStart(dir: string): void {
  git(dir, ['reset', '-q', '--hard', 'start']);
  git(dir, ['clean', '-qfdx', '-e', 'node_modules']);
}

/**
 * Commit the current (condition-materialized) tree as the per-run baseline so a
 * later `git diff` captures ONLY the agent's edits — not the strip/add the
 * condition performed.
 */
export function commitConditionBaseline(dir: string): void {
  git(dir, ['add', '-A']);
  git(dir, ['commit', '-q', '--no-verify', '-m', '__condition_baseline', '--allow-empty']);
}

/**
 * The agent's full contribution vs the condition baseline. Stages first
 * (`git add -A`) so NEW files — a new screen the agent created — are included;
 * a plain `git diff` would silently miss untracked files.
 */
export function agentDiff(dir: string): string {
  git(dir, ['add', '-A']);
  return git(dir, ['diff', '--cached', '--no-color']).out;
}

export function changedFiles(dir: string): string[] {
  const out = git(dir, ['diff', '--cached', '--name-only']).out.trim();
  return out ? out.split('\n').filter(Boolean) : [];
}

// ---------------------------------------------------------------------------
// diff parsing — per-file added ('+') lines, for grep-diff assertions
// ---------------------------------------------------------------------------

/** Map of `relpath -> string[] of added lines` (the '+' side, sans the marker). */
export function addedLinesByFile(diffText: string): Record<string, string[]> {
  const byFile: Record<string, string[]> = {};
  let current: string | null = null;
  for (const line of diffText.split('\n')) {
    const m = /^\+\+\+ b\/(.+)$/.exec(line);
    if (m) {
      current = m[1];
      byFile[current] = byFile[current] || [];
      continue;
    }
    if (line.startsWith('diff --git')) current = null;
    if (current && line.startsWith('+') && !line.startsWith('+++')) {
      byFile[current].push(line.slice(1));
    }
  }
  return byFile;
}

export const isMobileFile = (p: string): boolean => /(^|\/)mobile\/.*\.(t|j)sx?$/.test(p);

// ---------------------------------------------------------------------------
// ast-grep — the objective scoring function. Runs with the harness's snapshot
// of the rules (SCORER_DIR) so the score is IDENTICAL across all conditions,
// even OFF where the in-tree rules were stripped.
// ---------------------------------------------------------------------------

export interface SgMatch {
  ruleId: string;
  file: string | null;
}

export interface AstGrepResult {
  ok: boolean;
  matches: SgMatch[];
  reason?: string;
}

export function resolveAstGrep(appDir: string, repoRoot: string): string | null {
  const candidates = [
    path.join(appDir, 'node_modules', '.bin', 'ast-grep'),
    path.join(repoRoot, 'node_modules', '.bin', 'ast-grep'),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

/**
 * Scan the given files (relative to appDir) with the scorer's rule snapshot.
 * A null binary or an empty file list yields `{ ok:true, matches:[] }`.
 */
export function astGrepScan(args: {
  bin: string | null;
  scorerDir: string;
  appDir: string;
  files: string[];
}): AstGrepResult {
  const { bin, scorerDir, appDir, files } = args;
  if (!bin) return { ok: false, matches: [], reason: 'ast-grep binary not found (run setup / npm install)' };
  const targets = (files ?? []).filter(Boolean);
  if (targets.length === 0) return { ok: true, matches: [] };

  const cfg = path.join(scorerDir, 'sgconfig.yml');
  const abs = targets.map((f) => path.join(appDir, f));
  // --json=compact emits a single JSON array of matches.
  const res = sh(bin, ['scan', '-c', cfg, '--json=compact', ...abs], { cwd: appDir });
  let matches: SgMatch[] = [];
  try {
    const parsed = JSON.parse(res.out.trim() || '[]') as Array<Record<string, string>>;
    matches = parsed.map((m) => ({ ruleId: m.ruleId ?? m.rule_id ?? m.id, file: m.file ?? null }));
  } catch {
    // Fallback: text mode, regex the rule ids out (loses file attribution).
    const text = sh(bin, ['scan', '-c', cfg, ...abs], { cwd: appDir }).out;
    matches = [...text.matchAll(/(?:error|warning)\[([a-z0-9-]+)\]/g)].map((m) => ({
      ruleId: m[1],
      file: null,
    }));
  }
  return { ok: true, matches };
}

// ---------------------------------------------------------------------------
// condition materialization
// ---------------------------------------------------------------------------

type DeleteTarget = { kind: 'name' | 'rel' | 'dir'; value: string };

const SALIENCE_DELETE_GLOBS: DeleteTarget[] = [
  // every nested AGENTS.md (root + service-root + subsystem) + the Claude bridge
  { kind: 'name', value: 'AGENTS.md' },
  { kind: 'rel', value: 'CLAUDE.md' },
  // push glob-rule dirs (M3) replaced the legacy flat .cursorrules/.windsurfrules
  { kind: 'dir', value: '.cursor' },
  { kind: 'dir', value: '.windsurf' },
  // .claude covers skills (M4) + the PostToolUse hook
  { kind: 'dir', value: '.claude' },
  // enforcement config is inert during an agent run, but OFF means "no context":
  { kind: 'rel', value: 'sgconfig.yml' },
  { kind: 'dir', value: '.stackr' },
];

function rmRel(appDir: string, rel: string): void {
  fs.rmSync(path.join(appDir, rel), { recursive: true, force: true });
}

function rmByName(appDir: string, name: string): void {
  const walk = (dir: string): void => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name === name) fs.rmSync(full, { force: true });
    }
  };
  walk(appDir);
}

/**
 * Bring the app to the requested condition. Assumes the tree is pristine
 * (`resetToStart` was just called).
 *
 *   off         → strip ALL agent context + enforcement config; no hook.
 *   salience    → keep context; disable the reinject hook.
 *   enforcement → keep context; install the MOBILE ast-grep PostToolUse hook
 *                 (the shipped hook is ESLint/backend-only and no-ops on mobile,
 *                 so the harness supplies the one this slice needs — see ../README.md).
 */
export function materializeCondition(appDir: string, condition: string, harnessDir: string): void {
  if (condition === 'off') {
    for (const g of SALIENCE_DELETE_GLOBS) {
      if (g.kind === 'name') rmByName(appDir, g.value);
      else rmRel(appDir, g.value);
    }
    return;
  }

  // Both salience conditions keep the context. Difference is the hook.
  const claudeDir = path.join(appDir, '.claude');
  const settings = path.join(claudeDir, 'settings.json');

  if (condition === 'salience') {
    // Disable any reinject: remove the PostToolUse settings (context stays).
    fs.rmSync(settings, { force: true });
    return;
  }

  if (condition === 'enforcement') {
    fs.mkdirSync(path.join(claudeDir, 'hooks'), { recursive: true });
    fs.copyFileSync(
      path.join(harnessDir, 'hooks', 'check-edited-mobile.mts'),
      path.join(claudeDir, 'hooks', 'check-edited-mobile.mts')
    );
    fs.copyFileSync(path.join(harnessDir, 'hooks', 'settings.json'), settings);
    return;
  }

  throw new Error(`Unknown condition: ${condition}`);
}

// ---------------------------------------------------------------------------
// stats
// ---------------------------------------------------------------------------

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}
