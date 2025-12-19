import chalk from 'chalk';
import inquirer from 'inquirer';
import path from 'path';
import fs from 'fs-extra';
import { collectConfiguration } from './prompts/index.js';
import { validateProjectName, validateConfiguration } from './utils/validation.js';
import { ProjectGenerator } from './generators/index.js';
import { displaySuccess, errors } from './utils/errors.js';
import { validatePackageManager } from './utils/system-validation.js';
import type { ProjectConfig, CLIOptions } from './types/index.js';

export async function runCLI(
  projectName: string | undefined,
  options: CLIOptions
): Promise<void> {
  console.log(chalk.cyan("\n🚀 Let's create your full-stack app!\n"));

  // Step 1: Collect configuration through prompts
  const config = await collectConfiguration(projectName, options);

  // Step 2: Validate project name
  const nameValidation = validateProjectName(config.projectName);
  if (!nameValidation.valid) {
    throw errors.invalidProjectName(config.projectName, nameValidation.error || 'Invalid name');
  }

  // Step 3: Validate configuration
  const configValidation = validateConfiguration(config);
  if (!configValidation.valid) {
    throw errors.configValidationFailed([configValidation.error || 'Invalid configuration']);
  }

  // Step 4: Validate package manager availability
  await validatePackageManager(config.packageManager);

  // Step 5: Display final configuration summary
  displayConfigSummary(config);

  // Step 6: Check if directory exists
  const targetDir = path.resolve(process.cwd(), config.projectName);
  if (await fs.pathExists(targetDir)) {
    throw errors.directoryExists(config.projectName);
  }

  // Step 7: Confirm with user
  const confirmed = await confirmGeneration();
  if (!confirmed) {
    console.log(chalk.yellow('\n⚠️  Project creation cancelled.\n'));
    process.exit(0);
  }

  // Step 8: Generate project
  console.log(chalk.cyan('\n📦 Creating your project...\n'));
  const generator = new ProjectGenerator({ ...config, verbose: options.verbose });
  await generator.generate(targetDir);

  // Step 9: Show success message with setup instructions
  const nextSteps = [
    `📂 Location: ${targetDir}`,
    '',
    chalk.bold('Next steps:'),
    '',
    `  ${chalk.cyan('1.')} cd ${config.projectName}`,
    `  ${chalk.cyan('2.')} ./scripts/setup.sh`,
    '',
    chalk.gray('The setup script will:'),
    chalk.gray('  • Create .env files with secure credentials'),
    chalk.gray('  • Install dependencies'),
    chalk.gray('  • Set up the database'),
  ];

  // Add platform-specific next steps
  if (config.platforms.includes('mobile') || config.platforms.includes('web')) {
    nextSteps.push('');
    nextSteps.push(chalk.bold('Start development:'));
  }
  if (config.platforms.includes('mobile')) {
    nextSteps.push(chalk.gray(`  • Mobile: cd mobile && ${config.packageManager} start`));
  }
  if (config.platforms.includes('web')) {
    nextSteps.push(chalk.gray(`  • Web: cd web && ${config.packageManager} run dev`));
  }
  nextSteps.push(chalk.gray(`  • Backend: cd backend && ${config.packageManager} run dev:rest-api`));

  displaySuccess('Project created successfully!', nextSteps);
}

async function confirmGeneration(): Promise<boolean> {
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

function displayConfigSummary(config: ProjectConfig): void {
  console.log(chalk.cyan('\n📋 Project Configuration:\n'));
  console.log(`  ${chalk.bold('Project:')} ${config.projectName}`);

  // Display platforms
  const platformLabels = {
    mobile: 'Mobile (Expo)',
    web: 'Web (Next.js)',
  };
  const platformsDisplay = config.platforms
    .map(p => platformLabels[p])
    .join(', ');
  console.log(`  ${chalk.bold('Platforms:')} ${platformsDisplay}`);

  const features = Object.entries(config.features)
    .filter(([_, value]) => {
      if (typeof value === 'boolean') return value;
      if (typeof value === 'object' && 'enabled' in value) return value.enabled;
      return false;
    })
    .map(([key]) => key)
    .join(', ') || 'None';
  console.log(`  ${chalk.bold('Features:')} ${features}`);

  const integrations = Object.entries(config.integrations)
    .filter(([_, value]) => value.enabled)
    .map(([key]) => key)
    .join(', ') || 'None';
  console.log(`  ${chalk.bold('Integrations:')} ${integrations}`);

  console.log(`  ${chalk.bold('Package Manager:')} ${config.packageManager}`);
  console.log();
}

