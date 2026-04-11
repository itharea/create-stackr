#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { runAddService } from '../commands/add-service.js';
import { runMigrationsAck } from '../commands/migrations-ack.js';
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
        force: options.force as boolean | undefined,
        verbose: options.verbose as boolean | undefined,
      });
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
// Help text
// ---------------------------------------------------------------------------

program.addHelpText(
  'after',
  `

Examples:
  $ stackr add service wallet
  $ stackr add service wallet --no-install
  $ stackr add service wallet --web --port 8083
  $ stackr migrations ack auth

Run ${chalk.bold('stackr <cmd> --help')} for per-command details.

For more information, visit:
  https://stackr.sh/docs
`
);

program.parse();
