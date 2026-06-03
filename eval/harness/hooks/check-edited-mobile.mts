/**
 * HARNESS-SUPPLIED Claude Code PostToolUse hook for the *enforcement* condition
 * — the MOBILE reinject loop the shipped build does not have.
 *
 * `.mts` (not `.ts`) on purpose: this file is copied into the generated app and
 * run as `node .claude/hooks/check-edited-mobile.mts`. That app's package.json
 * has no `"type"` field (CommonJS), so a plain `.ts` with ESM imports would
 * break there; `.mts` is always an ES module regardless of the host package.
 *
 * Behavior: read the edited file path from stdin JSON; if it is a mobile
 * .ts/.tsx, run `ast-grep scan` on just that file using the project's own
 * `.stackr/sg-rules`; on any match, write diagnostics to stderr and `exit 2`
 * (Claude surfaces stderr for self-repair). No-op (exit 0) when ast-grep / the
 * rules are absent — the freshly scaffolded state.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

function readStdin(): string {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

let payload: { tool_input?: { file_path?: string } } = {};
try {
  payload = JSON.parse(readStdin() || '{}');
} catch {
  process.exit(0);
}

const filePath = payload?.tool_input?.file_path;
if (!filePath || !/mobile\/.*\.(ts|tsx)$/.test(filePath) || !fs.existsSync(filePath)) {
  process.exit(0);
}

// Walk up from the edited file to the project root (the dir holding sgconfig.yml).
function findProjectRoot(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, 'sgconfig.yml'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

const resolved = path.resolve(filePath);
const root = findProjectRoot(path.dirname(resolved));
if (!root) process.exit(0); // enforcement config stripped (OFF) / not present yet.

const bin = path.join(root, 'node_modules', '.bin', 'ast-grep');
if (!fs.existsSync(bin)) process.exit(0); // deps not installed — stay silent.

const res = spawnSync(bin, ['scan', resolved], { cwd: root, encoding: 'utf8' });
if (res.status === 0) process.exit(0);

const out = `${res.stdout || ''}${res.stderr || ''}`.trim();
process.stderr.write(`ast-grep found issues in ${path.basename(resolved)}:\n${out}\n`);
process.exit(2);
