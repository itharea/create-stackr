/**
 * Scorer: given the agent's diff for one task under one condition, run the
 * checkers and return a structured score. THROWAWAY (the rules it invokes are
 * the durable part — they come from the generated app via the scorer-config
 * snapshot, not from here).
 *
 * Metrics:
 *   - gate-able violations (the PRIMARY number): ast-grep error count + the
 *     grep-diff `forbid` assertions, over the agent's diff.
 *   - require-misses: `require` assertions whose pattern never appeared.
 *   - hand assertions: surfaced for manual resolution (not auto-scored).
 *
 * Cause label:
 *   - condition 'off'          → every violation is absent-from-context.
 *   - 'salience'/'enforcement' → present-but-ignored by default (the salience
 *     ceiling). Upgrade individual rows to present-but-misapplied by hand when
 *     the agent clearly TRIED and got it wrong.
 */
import {
  addedLinesByFile,
  agentDiff,
  changedFiles,
  isMobileFile,
  astGrepScan,
  resolveAstGrep,
} from './lib.ts';
import type { Task } from '../suite.ts';

export type RowStatus = 'pass' | 'violation' | 'missing' | 'manual';
export type Cause = 'absent-from-context' | 'present-but-ignored' | 'present-but-misapplied';

export interface ScoreRow {
  id: string;
  kind: string;
  via: string;
  rule?: string;
  count?: number;
  status: RowStatus;
  cause?: Cause | null;
  astGrepOk?: boolean;
  note?: string;
}

export interface TaskScore {
  taskId: string;
  condition: string;
  gateViolations: number;
  requireMisses: number;
  diffStat: { changedFiles: number; mobileFiles: number; addedMobileLines: number };
  astGrepAvailable: boolean;
  rows: ScoreRow[];
  emptyDiff: boolean;
}

function causeFor(condition: string): Cause {
  return condition === 'off' ? 'absent-from-context' : 'present-but-ignored';
}

export function scoreTask(args: {
  appDir: string;
  condition: string;
  task: Task;
  scorerDir: string;
  repoRoot: string;
}): TaskScore {
  const { appDir, condition, task, scorerDir, repoRoot } = args;
  const diff = agentDiff(appDir);
  const files = changedFiles(appDir);
  const mobileFiles = files.filter(isMobileFile);
  const added = addedLinesByFile(diff);
  const addedMobileLines = Object.entries(added)
    .filter(([f]) => isMobileFile(f))
    .flatMap(([, lines]) => lines);

  // One ast-grep scan over the agent's changed mobile files; index by rule id.
  const bin = resolveAstGrep(appDir, repoRoot);
  const scan = astGrepScan({ bin, scorerDir, appDir, files: mobileFiles });
  const astCountByRule: Record<string, number> = {};
  for (const m of scan.matches) astCountByRule[m.ruleId] = (astCountByRule[m.ruleId] ?? 0) + 1;

  const rows: ScoreRow[] = task.assertions.map((a): ScoreRow => {
    if (a.via === 'ast-grep') {
      const count = astCountByRule[a.rule!] ?? 0;
      return {
        id: a.id,
        kind: a.kind,
        via: a.via,
        rule: a.rule,
        count,
        status: count > 0 ? 'violation' : 'pass',
        cause: count > 0 ? causeFor(condition) : null,
        astGrepOk: scan.ok,
      };
    }
    if (a.via === 'grep-diff') {
      const re = new RegExp(a.pattern!);
      const hits = addedMobileLines.filter((l) => re.test(l)).length;
      if (a.kind === 'forbid') {
        return {
          id: a.id,
          kind: a.kind,
          via: a.via,
          count: hits,
          status: hits > 0 ? 'violation' : 'pass',
          cause: hits > 0 ? causeFor(condition) : null,
        };
      }
      // require
      return {
        id: a.id,
        kind: a.kind,
        via: a.via,
        count: hits,
        status: hits > 0 ? 'pass' : 'missing',
        cause: hits > 0 ? null : causeFor(condition),
      };
    }
    // hand
    return { id: a.id, kind: a.kind, via: a.via, status: 'manual', note: a.note };
  });

  const gateViolations = rows.filter((r) => r.status === 'violation' && r.kind === 'forbid').length;
  const requireMisses = rows.filter((r) => r.status === 'missing').length;

  return {
    taskId: task.id,
    condition,
    gateViolations, // PRIMARY metric for this task/run
    requireMisses,
    diffStat: {
      changedFiles: files.length,
      mobileFiles: mobileFiles.length,
      addedMobileLines: addedMobileLines.length,
    },
    astGrepAvailable: scan.ok,
    rows,
    emptyDiff: files.length === 0,
  };
}
