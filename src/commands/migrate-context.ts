import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

import { requireProjectRoot } from '../utils/project-root.js';
import { loadStackrConfig } from '../utils/config-file.js';
import { stackrConfigToInitConfig } from '../generators/service-context.js';
import { buildAIContextPlan, writeAIContextPlan } from '../generators/ai-context.js';

export interface MigrateContextOptions {
  /** Print the write/delete plan without touching disk. */
  dryRun?: boolean;
}

export interface MigrateContextResult {
  /** Project-relative paths the migration would (or did) write. */
  writes: string[];
  /** Project-relative paths the migration would (or did) delete (only those
   *  that currently exist on disk). */
  deletes: string[];
  /** Legacy single-file rule formats that were retired by this run. */
  legacyRetired: string[];
  dryRun: boolean;
}

const LEGACY_FILES = ['.cursorrules', '.windsurfrules'];

/**
 * `stackr migrate context [--dry-run]` — bring an existing project's
 * agent-context layer up to the current format.
 *
 * Idempotent by construction: it re-derives every artifact from
 * `stackr.config.json` via `buildAIContextPlan` and runs the SAME executor
 * (`writeAIContextPlan`) used by init and `stackr doctor --fix` — no parallel
 * writer. Legacy `.cursorrules` / `.windsurfrules` are deleted as part of the
 * plan (Resolved decision 1: single format on disk, no stale duplicate).
 * Layout is detected from disk, not config — there is no context-layer version
 * field.
 */
export async function runMigrateContext(
  options: MigrateContextOptions = {}
): Promise<MigrateContextResult> {
  const root = await requireProjectRoot(process.cwd());
  const config = await loadStackrConfig(root);
  const initConfig = stackrConfigToInitConfig(config);
  const plan = buildAIContextPlan(root, initConfig);

  const writes = plan
    .filter((e) => e.action === 'write')
    .map((e) => path.relative(root, e.destPath))
    .sort();

  const deletes: string[] = [];
  for (const e of plan) {
    if (e.action === 'delete' && (await fs.pathExists(e.destPath))) {
      deletes.push(path.relative(root, e.destPath));
    }
  }
  deletes.sort();

  const legacyRetired: string[] = [];
  for (const f of LEGACY_FILES) {
    if (await fs.pathExists(path.join(root, f))) legacyRetired.push(f);
  }

  if (options.dryRun) {
    console.log(chalk.bold('stackr migrate context — dry run (no files changed)'));
    console.log(chalk.gray(`  ${writes.length} write(s), ${deletes.length} delete(s)`));
    for (const w of writes) console.log(`  ${chalk.green('write ')} ${w}`);
    for (const d of deletes) console.log(`  ${chalk.red('delete')} ${d}`);
    if (legacyRetired.length) {
      console.log(chalk.gray(`  retires legacy: ${legacyRetired.join(', ')}`));
    }
    return { writes, deletes, legacyRetired, dryRun: true };
  }

  await writeAIContextPlan(plan);

  console.log(chalk.green('✓ Migrated agent context to the current format.'));
  console.log(chalk.gray(`  ${writes.length} file(s) written, ${deletes.length} removed.`));
  if (legacyRetired.length) {
    console.log(chalk.gray(`  Retired legacy ${legacyRetired.join(', ')} → .cursor/rules, .windsurf/rules.`));
  }
  return { writes, deletes, legacyRetired, dryRun: false };
}
