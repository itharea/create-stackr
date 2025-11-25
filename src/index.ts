#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import { runCLI } from './cli.js';
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
      chalk.bold.cyan('Welcome to create-fullstack-app!\n\n') +
        chalk.white('Create a production-ready full-stack mobile app\n') +
        chalk.white('with backend infrastructure in minutes.'),
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
  .name('create-fullstack-app')
  .description('Create a production-ready full-stack mobile app')
  .version(packageJson.version)
  .argument('[project-name]', 'Name of the project')
  .option(
    '-t, --template <preset>',
    'Use a preset template (minimal, full-featured, analytics-focused)'
  )
  .option('--defaults', 'Use default configuration without prompts')
  .option('--verbose', 'Show detailed output')
  .option('--skip-install', 'Skip dependency installation')
  .action(async (projectName: string | undefined, options: any) => {
    try {
      displayWelcome();
      await runCLI(projectName, options);
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
  $ npx create-fullstack-app my-app
  $ npx create-fullstack-app my-app --template minimal
  $ npx create-fullstack-app my-app --defaults

For more information, visit:
  https://docs.create-fullstack-app.dev
`
);

// Parse arguments
program.parse();
