#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import { runCreateFlow } from './cli.js';
import { displayError } from './utils/errors.js';
import { validateNodeVersion } from './utils/system-validation.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);

// Validate Node.js version before proceeding
try {
  validateNodeVersion();
} catch (error) {
  displayError(error as Error);
  process.exit(1);
}

// Welcome banner
function displayWelcome() {
  console.log(
    boxen(
      chalk.bold.cyan('Welcome to create-stackr!\n\n') +
        chalk.white('Scaffold a production-ready multi-microservice monorepo\n') +
        chalk.white('with isolated auth, base services, Docker, and more.'),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
      }
    )
  );
}

// Configure CLI
program
  .name('create-stackr')
  .description('Create a production-ready multi-microservice monorepo')
  .version(packageJson.version)
  .argument('[project-name]', 'Name of the project')
  .option(
    '-t, --template <preset>',
    'Use a preset template (minimal, full-featured, analytics-focused)'
  )
  .option('--defaults', 'Use default configuration without prompts')
  .option('--verbose', 'Show detailed output')
  .option('--service-name <name>', 'Override the default initial base service name (default: "core")')
  .option('--no-auth', 'Skip scaffolding the auth/ service')
  .option(
    '--with-services <list>',
    'Comma-separated list of extra base services to scaffold (e.g. scout,manage)'
  )
  .action(async (projectName: string | undefined, options: any) => {
    try {
      displayWelcome();
      await runCreateFlow(projectName, {
        template: options.template,
        defaults: options.defaults,
        verbose: options.verbose,
        serviceName: options.serviceName,
        auth: options.auth,
        withServices: options.withServices,
      });
    } catch (error) {
      displayError(error as Error);
      process.exit(1);
    }
  });

// Add help text
program.addHelpText(
  'after',
  `

Examples:
  $ npx create-stackr my-app
  $ npx create-stackr my-app --defaults
  $ npx create-stackr my-app --defaults --with-services scout,manage
  $ npx create-stackr my-app --no-auth --service-name api

For more information, visit:
  https://stackr.sh/docs
`
);

// Parse arguments
program.parse();
