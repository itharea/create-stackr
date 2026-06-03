import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

import { requireProjectRoot } from '../utils/project-root.js';
import { loadStackrConfig } from '../utils/config-file.js';
import { stackrConfigToInitConfig } from '../generators/service-context.js';
import { buildAIContextPlan, writeAIContextPlan } from '../generators/ai-context.js';

export interface DoctorOptions {
  /** Regenerate the drifted artifacts instead of only reporting. */
  fix?: boolean;
}

export type DriftKind = 'missing' | 'modified' | 'stale';

export interface DriftItem {
  kind: DriftKind;
  /** Path relative to the project root. */
  rel: string;
}

export interface DoctorResult {
  drift: DriftItem[];
  fixed: boolean;
}

/**
 * `stackr doctor [--fix]` — a thin rendered-vs-disk diff of the agent-context
 * layer. The single source of truth is `stackr.config.json`: we re-derive the
 * full artifact plan (`buildAIContextPlan`) and compare it byte-for-byte to
 * disk. `--fix` reuses the SAME executor (`writeAIContextPlan`) — there is no
 * parallel writer — so a fixed project is byte-identical to a fresh init.
 *
 * Returns a structured result; the CLI layer maps a non-empty unfixed drift to
 * a non-zero exit code so `stackr doctor` is CI-gateable.
 */
export async function runDoctor(options: DoctorOptions = {}): Promise<DoctorResult> {
  const root = await requireProjectRoot(process.cwd());
  const config = await loadStackrConfig(root);
  const initConfig = stackrConfigToInitConfig(config);
  const plan = buildAIContextPlan(root, initConfig);

  const drift: DriftItem[] = [];
  for (const entry of plan) {
    const rel = path.relative(root, entry.destPath);
    if (entry.action === 'write') {
      if (!(await fs.pathExists(entry.destPath))) {
        drift.push({ kind: 'missing', rel });
      } else {
        const current = await fs.readFile(entry.destPath, 'utf-8');
        if (current !== (entry.contents ?? '')) drift.push({ kind: 'modified', rel });
      }
    } else if (await fs.pathExists(entry.destPath)) {
      // A planned delete whose target still exists is stale (e.g. a retired
      // .cursorrules, or a skill for a platform that was removed).
      drift.push({ kind: 'stale', rel });
    }
  }

  if (drift.length === 0) {
    console.log(chalk.green('✓ Agent context is in sync with stackr.config.json.'));
    return { drift, fixed: false };
  }

  console.log(
    chalk.yellow(`Agent-context drift detected (${drift.length} item${drift.length === 1 ? '' : 's'}):`)
  );
  const LABEL: Record<DriftKind, string> = {
    missing: 'missing ',
    modified: 'modified',
    stale: 'stale   ',
  };
  for (const d of drift) {
    console.log(`  ${chalk.gray(LABEL[d.kind])} ${d.rel}`);
  }

  if (!options.fix) {
    console.log();
    console.log(chalk.gray('Run `stackr doctor --fix` to regenerate these from the single source.'));
    return { drift, fixed: false };
  }

  await writeAIContextPlan(plan);
  console.log();
  console.log(chalk.green(`✓ Fixed ${drift.length} item${drift.length === 1 ? '' : 's'}.`));
  return { drift, fixed: true };
}
