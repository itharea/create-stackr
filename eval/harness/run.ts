/**
 * Orchestrator. THROWAWAY.
 *
 *   node eval/harness/run.ts --setup        # git-init + npm install the app
 *   node eval/harness/run.ts --dry-run      # plumbing check, no agent (scores empty diffs)
 *   node eval/harness/run.ts                # full run (requires EVAL_AGENT_CMD)
 *   node eval/harness/run.ts --task P13 --runs 5
 *
 * Loop: for each condition × task × run:
 *   reset→start · materialize condition · commit baseline · run agent · score diff · reset→start
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { config, CONDITION_LABELS, resolveModel } from './config.ts';
import { SUITE, taskById, type Task } from '../suite.ts';
import {
  sh,
  gitInitStart,
  resetToStart,
  materializeCondition,
  commitConditionBaseline,
  mean,
  stdev,
} from './lib.ts';
import { scoreTask, type TaskScore } from './score.ts';

interface RunRecord {
  taskId: string;
  condition: string;
  run: number;
  model: string | null;
  gateViolations: number;
  requireMisses: number;
  emptyDiff: boolean;
}

interface Cell {
  taskId: string;
  condition: string;
  n: number;
  meanViolations: number;
  stdev: number;
  meanRequireMisses: number;
  emptyDiffs: number;
}

interface Transcript {
  taskId: string;
  condition: string;
  run: number;
  model: string | null;
  score: TaskScore;
  agentRan: boolean;
  agentCode: number | null | undefined;
}

type TableRow = Record<string, string | number | null>;

const args = process.argv.slice(2);
const has = (f: string): boolean => args.includes(f);
const valOf = (f: string, d = ''): string => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};

const DRY = has('--dry-run');
const RUNS = Number(valOf('--runs', String(config.RUNS_PER_CONDITION)));
const TASKS: Task[] = has('--task') ? [taskById(valOf('--task'))] : SUITE;
const CONDITIONS = config.CONDITIONS;

function appReady(): boolean {
  return fs.existsSync(path.join(config.APP_DIR, 'sgconfig.yml'));
}

function setup(): void {
  if (!appReady()) {
    console.error('App not generated. Run first:\n  npm run build\n  node eval/harness/generate-app.ts');
    process.exit(1);
  }
  console.log('• git init + tag start');
  gitInitStart(config.APP_DIR);

  const astGrep = path.join(config.APP_DIR, 'node_modules', '.bin', 'ast-grep');
  if (!fs.existsSync(astGrep)) {
    console.log('• npm install (root — pulls @ast-grep/cli; the scorer needs it)');
    const r = sh('npm', ['install', '--no-audit', '--no-fund'], { cwd: config.APP_DIR });
    if (r.code !== 0) {
      console.error('npm install failed:\n' + r.out);
      process.exit(1);
    }
  } else {
    console.log('• ast-grep already installed');
  }
  // Re-tag start AFTER install so node_modules is excluded by clean -e.
  gitInitStart(config.APP_DIR);
  console.log('✓ setup complete');
}

/** Run the agent over one task with cwd = app dir; prompt on stdin. Optionally
 *  pins `--model` for the per-run model sweep. */
function runAgent(prompt: string, model: string | null): { ran: boolean; code?: number | null; out?: string } {
  if (!config.AGENT_CMD) {
    if (DRY) return { ran: false };
    console.error(
      'EVAL_AGENT_CMD is empty. Set it (see config.ts) or pass --dry-run.\n' +
        "Example: EVAL_AGENT_CMD='claude -p --dangerously-skip-permissions' node eval/harness/run.ts"
    );
    process.exit(1);
  }
  const [cmd, ...rest] = config.AGENT_CMD.split(' ');
  if (model) rest.push('--model', resolveModel(model));
  const res = spawnSync(cmd, rest, {
    cwd: config.APP_DIR,
    input: prompt,
    encoding: 'utf8',
    timeout: config.AGENT_TIMEOUT_MS,
  });
  return { ran: true, code: res.status, out: `${res.stdout ?? ''}${res.stderr ?? ''}` };
}

function aggregate(records: RunRecord[]): { cells: Record<string, Cell>; deltas: TableRow[] } {
  const byKey: Record<string, RunRecord[]> = {};
  for (const r of records) {
    const k = `${r.taskId}::${r.condition}`;
    (byKey[k] = byKey[k] || []).push(r);
  }
  const cells: Record<string, Cell> = {};
  for (const [k, rs] of Object.entries(byKey)) {
    const [taskId, condition] = k.split('::');
    const v = rs.map((r) => r.gateViolations);
    cells[k] = {
      taskId,
      condition,
      n: rs.length,
      meanViolations: Number(mean(v).toFixed(3)),
      stdev: Number(stdev(v).toFixed(3)),
      meanRequireMisses: Number(mean(rs.map((r) => r.requireMisses)).toFixed(3)),
      emptyDiffs: rs.filter((r) => r.emptyDiff).length,
    };
  }

  // The headline deltas: OFF→salience sizes the push-delivery effect;
  // salience→enforcement measures the reinject loop on top.
  const deltas: TableRow[] = [];
  for (const task of TASKS) {
    const off = cells[`${task.id}::off`];
    const sal = cells[`${task.id}::salience`];
    const enf = cells[`${task.id}::enforcement`];
    deltas.push({
      taskId: task.id,
      off: off?.meanViolations ?? null,
      salience: sal?.meanViolations ?? null,
      enforcement: enf?.meanViolations ?? null,
      'Δ off→salience': off && sal ? Number((off.meanViolations - sal.meanViolations).toFixed(3)) : null,
      'Δ salience→enforcement':
        sal && enf ? Number((sal.meanViolations - enf.meanViolations).toFixed(3)) : null,
    });
  }
  return { cells, deltas };
}

/** Model × condition breakdown (one row per task×model). Only meaningful with a
 *  model sweep; n=1 per cell, so directional. */
function aggregateByModel(records: RunRecord[], tasks: Task[]): TableRow[] {
  const models = [...new Set(records.map((r) => r.model).filter((m): m is string => Boolean(m)))];
  const rows: TableRow[] = [];
  for (const task of tasks) {
    for (const m of models) {
      const cell = (cond: string): number | null => {
        const rs = records.filter((r) => r.model === m && r.condition === cond && r.taskId === task.id);
        return rs.length ? Number(mean(rs.map((r) => r.gateViolations)).toFixed(3)) : null;
      };
      const off = cell('off');
      const sal = cell('salience');
      const enf = cell('enforcement');
      rows.push({
        task: task.id,
        model: m,
        off,
        salience: sal,
        enforcement: enf,
        'Δ off→sal': off != null && sal != null ? Number((off - sal).toFixed(3)) : null,
        'Δ sal→enf': sal != null && enf != null ? Number((sal - enf).toFixed(3)) : null,
      });
    }
  }
  return rows;
}

function main(): void {
  if (has('--setup')) {
    setup();
    return;
  }
  if (!appReady()) {
    console.error('App not generated/setup. Run:\n  npm run build\n  node eval/harness/generate-app.ts\n  node eval/harness/run.ts --setup');
    process.exit(1);
  }

  console.log(`tasks: ${TASKS.map((t) => t.id).join(', ')}`);
  console.log(`conditions: ${CONDITIONS.join(', ')} · runs/condition: ${RUNS}${DRY ? ' · DRY-RUN' : ''}\n`);

  const records: RunRecord[] = [];
  const transcripts: Transcript[] = [];

  for (const condition of CONDITIONS) {
    console.log(`\n=== ${CONDITION_LABELS[condition] ?? condition} ===`);
    for (const task of TASKS) {
      for (let run = 0; run < RUNS; run++) {
        const model = config.MODELS.length ? config.MODELS[run % config.MODELS.length] : null;
        resetToStart(config.APP_DIR);
        materializeCondition(config.APP_DIR, condition, config.HARNESS_DIR);
        commitConditionBaseline(config.APP_DIR);

        const agent = runAgent(task.prompt, model);
        const score = scoreTask({
          appDir: config.APP_DIR,
          condition,
          task,
          scorerDir: config.SCORER_DIR,
          repoRoot: config.REPO_ROOT,
        });

        records.push({
          taskId: task.id,
          condition,
          run,
          model,
          gateViolations: score.gateViolations,
          requireMisses: score.requireMisses,
          emptyDiff: score.emptyDiff,
        });
        transcripts.push({ taskId: task.id, condition, run, model, score, agentRan: agent.ran, agentCode: agent.code });

        const flag = score.emptyDiff ? ' (empty diff)' : '';
        const ml = model ? `[${model}] ` : '';
        process.stdout.write(
          `  ${task.id} ${ml}run ${run + 1}/${RUNS}: ${score.gateViolations} viol, ${score.requireMisses} miss${flag}\n`
        );

        resetToStart(config.APP_DIR);
      }
    }
  }

  const summary = aggregate(records);

  if (DRY && !config.AGENT_CMD) {
    console.log('\n[dry-run] No agent ran; diffs are empty so violation counts are 0 by construction.');
    console.log('[dry-run] Plumbing OK: reset → materialize → baseline → score → reset cycled cleanly.');
  }

  console.log('\n=== headline deltas (mean gate-able violations per first edit) ===');
  console.table(summary.deltas);

  let byModel: TableRow[] | null = null;
  if (config.MODELS.length) {
    byModel = aggregateByModel(records, TASKS);
    console.log('\n=== by model (gate-able violations · n=1/cell · directional) ===');
    console.table(byModel);
  }

  fs.mkdirSync(config.RESULTS_DIR, { recursive: true });
  const outPath = path.join(config.RESULTS_DIR, 'mobile-result.json');
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        meta: {
          runsPerCondition: RUNS,
          conditions: CONDITIONS,
          tasks: TASKS.map((t) => t.id),
          models: config.MODELS,
          dryRun: DRY,
          agentCmd: config.AGENT_CMD || null,
        },
        deltas: summary.deltas,
        byModel,
        cells: summary.cells,
        records,
        transcripts,
      },
      null,
      2
    )
  );
  console.log(`\n✓ wrote ${outPath}`);
}

main();
