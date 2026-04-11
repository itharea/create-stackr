import chalk from 'chalk';
import { requireProjectRoot } from '../utils/project-root.js';
import { loadStackrConfig, saveStackrConfig } from '../utils/config-file.js';
import type { PendingMigration } from '../types/config-file.js';

/**
 * `stackr migrations ack <service>` — bookkeeping-only escape hatch.
 *
 * Removes the FIRST `PendingMigration` entry in `stackr.config.json`
 * matching `<service>` and persists the updated config. Trust model matches
 * `git commit --amend`: we assume the user actually ran the migration by
 * hand before acking.
 *
 * Each ack clears exactly one entry — if a user has stacked pending
 * migrations for the same service (possible via `stackr add service
 * --force`), they must ack once per migration.
 *
 * See `plans/meta_phases.md` §8 for the full rationale and the
 * primary path (`stackr migrate`, deferred to a follow-up).
 */
export async function runMigrationsAck(service: string): Promise<void> {
  const root = await requireProjectRoot(process.cwd());
  const config = await loadStackrConfig(root);

  const pending: PendingMigration[] = config.pendingMigrations ?? [];
  const matchIndex = pending.findIndex((entry) => entry.service === service);

  if (matchIndex === -1) {
    console.log(chalk.gray(`No pending migrations for "${service}".`));
    return;
  }

  const [removed] = pending.splice(matchIndex, 1);
  // Preserve the "empty vs undefined" distinction for minimal JSON churn:
  // once the list empties out, drop the key entirely.
  if (pending.length === 0) {
    delete config.pendingMigrations;
  } else {
    config.pendingMigrations = pending;
  }
  await saveStackrConfig(root, config);

  const remaining = pending.length;
  console.log(
    chalk.green(`✓ Acked pending migration for "${service}"`) +
      chalk.gray(` (${removed.reason})`)
  );
  if (remaining === 0) {
    console.log(chalk.gray('  No other pending migrations.'));
  } else {
    console.log(chalk.gray(`  ${remaining} pending migration${remaining === 1 ? '' : 's'} remaining.`));
  }
}
