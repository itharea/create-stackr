#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { runAddService } from '../commands/add-service.js';
import { runAddEntity } from '../commands/add-entity.js';
import { runMigrationsAck } from '../commands/migrations-ack.js';
import { runDoctor } from '../commands/doctor.js';
import { runMigrateContext } from '../commands/migrate-context.js';
import { displayError } from '../utils/errors.js';
import { validateNodeVersion } from '../utils/system-validation.js';
import { readStackrVersion } from '../utils/version.js';

// Validate Node.js version before proceeding. Same gate as the create
// binary — the stackr binary shares the same runtime contract.
try {
  validateNodeVersion();
} catch (error) {
  displayError(error as Error);
  process.exit(1);
}

program
  .name('stackr')
  .description('Post-init operations for a create-stackr project')
  .version(readStackrVersion());

// ---------------------------------------------------------------------------
// `stackr add <thing>`
// ---------------------------------------------------------------------------

const addCommand = program
  .command('add')
  .description('Add a new thing to an existing stackr project');

addCommand
  .command('service <name>')
  .description('Scaffold a new microservice inside this stackr project')
  .option(
    '--auth-middleware <type>',
    'Auth middleware flavor (standard | role-gated | flexible | none)'
  )
  .option('--web', 'Also scaffold a per-service web frontend')
  .option('--mobile', 'Also scaffold a per-service mobile frontend')
  .option('--event-queue', 'Enable the event queue (BullMQ + Redis)')
  .option('--no-event-queue', 'Disable the event queue')
  .option('--port <n>', 'Explicit REST API port', (value) => Number.parseInt(value, 10))
  .option('--no-install', 'Skip package manager install in the new service')
  .option('--no-tests', 'skip Vitest scaffolding for this service')
  .option('--force', 'Bypass pending-migration refusal and missing compose markers')
  .option('--verbose', 'Show detailed progress logging')
  .action(async (name: string, options: Record<string, unknown>) => {
    try {
      await runAddService(name, {
        authMiddleware: options.authMiddleware as
          | 'standard'
          | 'role-gated'
          | 'flexible'
          | 'none'
          | undefined,
        web: options.web as boolean | undefined,
        mobile: options.mobile as boolean | undefined,
        // Commander turns `--no-event-queue` into `eventQueue: false` on the
        // options bag. `--event-queue` → true. Unspecified → undefined.
        eventQueue: options.eventQueue as boolean | undefined,
        port: options.port as number | undefined,
        // Commander's `--no-install` flips `install` to `false`. Default true.
        install: (options.install as boolean | undefined) ?? true,
        // Commander's `--no-tests` flips `tests` to `false`. Default true
        // is applied inside `runAddService` via `options.tests ?? true`.
        tests: options.tests as boolean | undefined,
        force: options.force as boolean | undefined,
        verbose: options.verbose as boolean | undefined,
      });
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

addCommand
  .command('entity <service> <entity>')
  .description('Scaffold a domain entity (schema + repository + service) and merge its ORM table')
  .option('--verbose', 'Show detailed progress logging')
  .action(async (service: string, entity: string, options: Record<string, unknown>) => {
    try {
      await runAddEntity(service, entity, { verbose: options.verbose as boolean | undefined });
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// `stackr migrations ack <service>`
// ---------------------------------------------------------------------------

const migrationsCommand = program
  .command('migrations')
  .description('Manage pending database migrations tracked in stackr.config.json');

migrationsCommand
  .command('ack <service>')
  .description('Clear one pending migration entry for <service> without running anything')
  .action(async (service: string) => {
    try {
      await runMigrationsAck(service);
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// `stackr doctor [--fix]`
// ---------------------------------------------------------------------------

program
  .command('doctor')
  .description('Check that the agent-context layer is in sync with stackr.config.json')
  .option('--fix', 'Regenerate any drifted agent-context artifacts from the single source')
  .action(async (options: Record<string, unknown>) => {
    try {
      const result = await runDoctor({ fix: options.fix as boolean | undefined });
      // CI-gateable: unfixed drift exits non-zero.
      if (!result.fixed && result.drift.length > 0) {
        process.exitCode = 1;
      }
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// `stackr migrate context [--dry-run]`
// ---------------------------------------------------------------------------

const migrateCommand = program
  .command('migrate')
  .description('Migrate parts of an existing stackr project to the current layout');

migrateCommand
  .command('context')
  .description(
    'Regenerate the agent-context layer (AGENTS.md, glob rules, skills, enforcement) and retire legacy .cursorrules/.windsurfrules'
  )
  .option('--dry-run', 'Print the write/delete plan without touching disk')
  .action(async (options: Record<string, unknown>) => {
    try {
      await runMigrateContext({ dryRun: options.dryRun as boolean | undefined });
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// ---------------------------------------------------------------------------
// Help text
// ---------------------------------------------------------------------------

program.addHelpText(
  'after',
  `

Examples:
  $ stackr add service wallet
  $ stackr add service wallet --no-install
  $ stackr add service wallet --web --port 8083
  $ stackr add entity blog comment
  $ stackr migrations ack auth
  $ stackr doctor
  $ stackr doctor --fix
  $ stackr migrate context --dry-run

Run ${chalk.bold('stackr <cmd> --help')} for per-command details.

For more information, visit:
  https://stackr.sh/docs
`
);

program.parse();
