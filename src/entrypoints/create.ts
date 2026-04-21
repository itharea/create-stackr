#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import { runCreateFlow } from '../cli.js';
import { displayError } from '../utils/errors.js';
import { validateNodeVersion } from '../utils/system-validation.js';
import { readStackrVersion } from '../utils/version.js';

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
  .version(readStackrVersion())
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
  .option('--no-tests', 'skip Vitest scaffolding')
  .option('--ci-workflow', 'generate .github/workflows/test.yml')
  .action(async (projectName: string | undefined, options: Record<string, unknown>) => {
    try {
      displayWelcome();
      await runCreateFlow(projectName, {
        template: options.template as string | undefined,
        defaults: options.defaults as boolean | undefined,
        verbose: options.verbose as boolean | undefined,
        serviceName: options.serviceName as string | undefined,
        auth: options.auth as boolean | undefined,
        withServices: options.withServices as string | undefined,
        tests: options.tests as boolean | undefined,
        ciWorkflow: options.ciWorkflow as boolean | undefined,
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

After your project is generated, run \`<pm> run setup\` once — it
installs the monorepo-root devDependency on \`create-stackr\`, which
drops the \`stackr\` binary into \`node_modules/.bin\` so you can run:
  $ cd my-app
  $ bun run setup    # or: npm run setup / yarn setup
  $ npx stackr add service wallet
If you prefer a system-wide install: \`npm i -g create-stackr\` once,
then \`stackr add service wallet\` works from any generated project.

For more information, visit:
  https://stackr.sh/docs
`
);

// Parse arguments
program.parse();
