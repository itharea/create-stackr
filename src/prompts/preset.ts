import inquirer from 'inquirer';
import chalk from 'chalk';
import { PRESETS } from '../config/presets.js';
import type { ProjectConfig } from '../types/index.js';

export async function selectPreset(): Promise<
  Omit<ProjectConfig, 'projectName' | 'packageManager' | 'appScheme'> | null
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
  config: Omit<ProjectConfig, 'projectName' | 'packageManager' | 'appScheme'>
): Promise<Omit<ProjectConfig, 'projectName' | 'packageManager' | 'appScheme'>> {
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

  // First, ask about platforms
  // @ts-expect-error - inquirer types are too strict
  const { platformsToInclude } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'platformsToInclude',
      message: 'Which platforms do you want to include?',
      choices: [
        {
          name: 'Mobile (Expo + React Native)',
          value: 'mobile',
          checked: config.platforms.includes('mobile'),
        },
        {
          name: 'Web (Next.js)',
          value: 'web',
          checked: config.platforms.includes('web'),
        },
      ],
      validate: (input: string[]) => {
        if (input.length === 0) {
          return 'Please select at least one platform';
        }
        return true;
      },
    },
  ]);

  const hasMobile = platformsToInclude.includes('mobile');

  const questions: any[] = [];

  // Only show onboarding for mobile
  if (hasMobile) {
    questions.push({
      type: 'confirm',
      name: 'onboarding',
      message: 'Include onboarding flow? (mobile only)',
      default: config.features.onboarding.enabled,
    });
    questions.push({
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
    });
    questions.push({
      type: 'confirm',
      name: 'paywall',
      message: 'Include subscription paywall? (mobile only)',
      default: config.features.paywall,
    });
    questions.push({
      type: 'confirm',
      name: 'revenueCat',
      message: 'Include RevenueCat (subscriptions)?',
      default: config.integrations.revenueCat.enabled,
      when: (answers: any) => answers.paywall,
    });
    questions.push({
      type: 'confirm',
      name: 'adjust',
      message: 'Include Adjust (attribution)?',
      default: config.integrations.adjust.enabled,
    });
    questions.push({
      type: 'confirm',
      name: 'scate',
      message: 'Include Scate (engagement)?',
      default: config.integrations.scate.enabled,
    });
  }

  // OAuth providers for both platforms
  questions.push({
    type: 'checkbox',
    name: 'oauthProviders',
    message: 'Select OAuth providers to enable:',
    choices: [
      { name: 'Google', value: 'google', checked: config.features.authentication.providers.google },
      { name: 'Apple', value: 'apple', checked: config.features.authentication.providers.apple },
      { name: 'GitHub', value: 'github', checked: config.features.authentication.providers.github },
    ],
  });

  const answers = await inquirer.prompt(questions) as {
    onboarding?: boolean;
    onboardingPages?: number;
    paywall?: boolean;
    revenueCat?: boolean;
    adjust?: boolean;
    scate?: boolean;
    oauthProviders?: string[];
  };

  return {
    ...config,
    platforms: platformsToInclude,
    features: {
      ...config.features,
      onboarding: {
        enabled: hasMobile ? (answers.onboarding ?? false) : false,
        pages: answers.onboardingPages || 3,
        skipButton: config.features.onboarding.skipButton,
        showPaywall: hasMobile && answers.paywall && answers.revenueCat,
      },
      authentication: {
        ...config.features.authentication,
        providers: {
          emailPassword: true,
          google: answers.oauthProviders?.includes('google') ?? config.features.authentication.providers.google,
          apple: answers.oauthProviders?.includes('apple') ?? config.features.authentication.providers.apple,
          github: answers.oauthProviders?.includes('github') ?? config.features.authentication.providers.github,
        },
      },
      paywall: hasMobile ? (answers.paywall ?? false) : false,
    },
    integrations: {
      ...config.integrations,
      revenueCat: {
        ...config.integrations.revenueCat,
        enabled: hasMobile ? (answers.revenueCat ?? false) : false,
      },
      adjust: {
        ...config.integrations.adjust,
        enabled: hasMobile ? (answers.adjust ?? false) : false,
      },
      scate: {
        ...config.integrations.scate,
        enabled: hasMobile ? (answers.scate ?? false) : false,
      },
      att: {
        ...config.integrations.att,
      },
    },
    customized: true,
  };
}

function displayPresetSummary(
  config: Omit<ProjectConfig, 'projectName' | 'packageManager' | 'appScheme'>
): void {
  const platformDisplay = config.platforms.length === 2
    ? 'mobile + web'
    : config.platforms[0];

  console.log(chalk.gray('Current configuration:'));
  console.log(chalk.gray(`  • Platforms: ${platformDisplay}`));
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
  console.log(
    chalk.gray(`  • Google OAuth: ${config.features.authentication.providers.google ? 'Yes' : 'No'}`)
  );
  console.log(
    chalk.gray(`  • Apple OAuth: ${config.features.authentication.providers.apple ? 'Yes' : 'No'}`)
  );
  console.log(
    chalk.gray(`  • GitHub OAuth: ${config.features.authentication.providers.github ? 'Yes' : 'No'}`)
  );
  console.log();
}
