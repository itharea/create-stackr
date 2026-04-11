import chalk from 'chalk';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs-extra';
import { collectConfiguration } from './prompts/index.js';
import { validateProjectName, validateConfiguration } from './utils/validation.js';
import { MonorepoGenerator } from './generators/monorepo.js';
import { displaySuccess, errors } from './utils/errors.js';
import { validatePackageManager } from './utils/system-validation.js';
import type { InitConfig, CLIOptions } from './types/index.js';
import { AI_TOOL_FILES } from './types/index.js';

/**
 * Phase 2 entry point for the `create-stackr` binary.
 *
 * Collects the `InitConfig`, validates it, confirms with the user, and
 * hands off to `MonorepoGenerator`. The success message enumerates every
 * service with its backend port.
 */
export async function runCreateFlow(
  projectName: string | undefined,
  options: CLIOptions
): Promise<void> {
  console.log(chalk.cyan("\n🚀 Let's create your multi-service monorepo!\n"));

  // Collect configuration (preset / defaults / interactive)
  const config = await collectConfiguration(projectName, options);

  // Validate project name
  const nameValidation = validateProjectName(config.projectName);
  if (!nameValidation.valid) {
    throw errors.invalidProjectName(config.projectName, nameValidation.error || 'Invalid name');
  }

  // Validate full config (service names, auth consistency, port uniqueness)
  const configValidation = validateConfiguration(config);
  if (!configValidation.valid) {
    throw errors.configValidationFailed([configValidation.error || 'Invalid configuration']);
  }

  // Validate package manager availability
  await validatePackageManager(config.packageManager);

  // Display final configuration summary
  displayConfigSummary(config);

  // Check if directory exists
  const targetDir = path.resolve(process.cwd(), config.projectName);
  if (await fs.pathExists(targetDir)) {
    throw errors.directoryExists(config.projectName);
  }

  // Confirm
  const confirmed = await confirmGeneration(options);
  if (!confirmed) {
    console.log(chalk.yellow('\n⚠️  Project creation cancelled.\n'));
    process.exit(0);
  }

  // Generate
  console.log(chalk.cyan('\n📦 Creating your monorepo...\n'));
  const generator = new MonorepoGenerator(config, { verbose: options.verbose });
  await generator.generate(targetDir);

  // Success
  const nextSteps: string[] = [
    `📂 Location: ${targetDir}`,
    '',
    chalk.bold('Services:'),
  ];
  for (const svc of config.services) {
    const label = svc.kind === 'auth' ? 'auth' : `base (${svc.name})`;
    nextSteps.push(
      `  • ${chalk.cyan(svc.name)} — ${label} @ ${chalk.bold(String(svc.backend.port))}${svc.web?.enabled ? ` / web @ ${svc.web.port}` : ''}${svc.mobile?.enabled ? ' / mobile' : ''}`
    );
  }
  nextSteps.push(
    '',
    chalk.bold('Next steps:'),
    '',
    `  ${chalk.cyan('1.')} cd ${config.projectName}`,
    `  ${chalk.cyan('2.')} ./scripts/setup.sh`,
    `  ${chalk.cyan('3.')} docker compose up -d`,
    '',
    chalk.gray('The setup script installs dependencies, wires the `stackr` CLI locally,'),
    chalk.gray('and creates per-service .env files. After it finishes you can grow the'),
    chalk.gray('monorepo with `npx stackr add service <name>`.')
  );

  displaySuccess('Monorepo created successfully!', nextSteps);
}

/**
 * @deprecated Legacy name for `runCreateFlow`. Kept for one release so
 * existing imports compile.
 */
export const runCLI = runCreateFlow;

async function confirmGeneration(options: CLIOptions): Promise<boolean> {
  if (options.defaults) return true;
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message: 'Ready to create your project?',
      default: true,
    },
  ]);
  return confirmed;
}

function displayConfigSummary(config: InitConfig): void {
  console.log(chalk.cyan('\n📋 Project Configuration:\n'));
  console.log(`  ${chalk.bold('Project:')} ${config.projectName}`);
  console.log(`  ${chalk.bold('ORM:')} ${config.orm}`);
  console.log(`  ${chalk.bold('Package Manager:')} ${config.packageManager}`);

  console.log(`  ${chalk.bold('Services:')}`);
  for (const svc of config.services) {
    const kindLabel = svc.kind === 'auth' ? chalk.yellow('[auth]') : chalk.green('[base]');
    const platformPieces: string[] = [`:${svc.backend.port}`];
    if (svc.web?.enabled) platformPieces.push(`web:${svc.web.port}`);
    if (svc.mobile?.enabled) platformPieces.push('mobile');
    if (svc.backend.eventQueue) platformPieces.push('event-queue');
    console.log(`    ${kindLabel} ${chalk.cyan(svc.name)} — ${platformPieces.join(' ')}`);
  }

  const aiToolsDisplay = config.aiTools.length
    ? config.aiTools.map((t) => AI_TOOL_FILES[t]).join(', ')
    : 'None';
  console.log(`  ${chalk.bold('AI Tools:')} ${aiToolsDisplay}`);
  console.log();
}
