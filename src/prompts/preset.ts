import inquirer from 'inquirer';
import chalk from 'chalk';
import { PRESETS } from '../config/presets.js';
import type { ProjectConfig } from '../types/index.js';

export async function selectPreset(): Promise<
  Omit<ProjectConfig, 'projectName' | 'packageManager'> | null
> {
  const choices = [
    ...PRESETS.map((preset) => ({
      name: `${preset.icon} ${preset.name} - ${preset.description}`,
      value: preset.name,
      short: preset.name,
    })),
    {
      name: '⚙️  Custom - Pick exactly what you need',
      value: 'custom',
      short: 'Custom',
    },
  ];

  const { preset } = await inquirer.prompt([
    {
      type: 'list',
      name: 'preset',
      message: 'Choose a starting template:',
      choices,
      pageSize: 10,
    },
  ]);

  // If custom, return null to trigger custom flow
  if (preset === 'custom') {
    return null;
  }

  // Load preset config
  const selectedPreset = PRESETS.find((p) => p.name === preset);
  if (!selectedPreset) {
    throw new Error(`Preset not found: ${preset}`);
  }

  return selectedPreset.config;
}

export async function customizePreset(
  config: Omit<ProjectConfig, 'projectName' | 'packageManager'>
): Promise<Omit<ProjectConfig, 'projectName' | 'packageManager'>> {
  const { customize } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'customize',
      message: 'Do you want to customize this preset?',
      default: false,
    },
  ]);

  if (!customize) {
    return config;
  }

  console.log(chalk.cyan('\n📝 Customize your preset:\n'));

  // Show current configuration
  displayPresetSummary(config);

  // @ts-expect-error - inquirer types are too strict for our use case
  const answers: any = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'onboarding',
      message: 'Include onboarding flow?',
      default: config.features.onboarding.enabled,
    },
    {
      type: 'number',
      name: 'onboardingPages',
      message: 'How many onboarding pages? (1-5)',
      default: config.features.onboarding.pages || 3,
      when: (answers: any) => answers.onboarding,
      validate: (input: number) => {
        if (input < 1 || input > 5) {
          return 'Please enter a number between 1 and 5';
        }
        return true;
      },
    },
    {
      type: 'confirm',
      name: 'paywall',
      message: 'Include subscription paywall?',
      default: config.features.paywall,
    },
    {
      type: 'confirm',
      name: 'revenueCat',
      message: 'Include RevenueCat (subscriptions)?',
      default: config.integrations.revenueCat.enabled,
      when: (answers: any) => answers.paywall,
    },
    {
      type: 'confirm',
      name: 'adjust',
      message: 'Include Adjust (attribution)?',
      default: config.integrations.adjust.enabled,
    },
    {
      type: 'confirm',
      name: 'scate',
      message: 'Include Scate (engagement)?',
      default: config.integrations.scate.enabled,
    },
  ]);

  // Update config with answers
  return {
    ...config,
    features: {
      ...config.features,
      onboarding: {
        enabled: answers.onboarding,
        pages: answers.onboardingPages || 3,
        skipButton: config.features.onboarding.skipButton,
        showPaywall: answers.paywall && answers.revenueCat,
      },
      paywall: answers.paywall,
    },
    integrations: {
      ...config.integrations,
      revenueCat: {
        ...config.integrations.revenueCat,
        enabled: answers.revenueCat || false,
      },
      adjust: {
        ...config.integrations.adjust,
        enabled: answers.adjust,
      },
      scate: {
        ...config.integrations.scate,
        enabled: answers.scate,
      },
      att: {
        ...config.integrations.att,
        enabled: answers.adjust, // Auto-enable ATT with Adjust
      },
    },
    customized: true,
  };
}

function displayPresetSummary(
  config: Omit<ProjectConfig, 'projectName' | 'packageManager'>
): void {
  console.log(chalk.gray('Current configuration:'));
  console.log(
    chalk.gray(
      `  • Onboarding: ${config.features.onboarding.enabled ? 'Yes' : 'No'}`
    )
  );
  console.log(chalk.gray(`  • Paywall: ${config.features.paywall ? 'Yes' : 'No'}`));
  console.log(
    chalk.gray(
      `  • RevenueCat: ${config.integrations.revenueCat.enabled ? 'Yes' : 'No'}`
    )
  );
  console.log(
    chalk.gray(`  • Adjust: ${config.integrations.adjust.enabled ? 'Yes' : 'No'}`)
  );
  console.log(
    chalk.gray(`  • Scate: ${config.integrations.scate.enabled ? 'Yes' : 'No'}`)
  );
  console.log();
}
