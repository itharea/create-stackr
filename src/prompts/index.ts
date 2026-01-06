import { promptProjectName } from './project.js';
import { selectPreset, customizePreset } from './preset.js';
import { promptFeatures } from './features.js';
import { promptSDKs } from './sdks.js';
import { promptOnboarding } from './onboarding.js';
import { promptPackageManager } from './packageManager.js';
import { promptORM } from './orm.js';
import { promptPlatforms } from './platform.js';
import { PRESETS } from '../config/presets.js';
import type { ProjectConfig, CLIOptions } from '../types/index.js';
import { deriveAppScheme } from '../types/index.js';

export async function collectConfiguration(
  projectName: string | undefined,
  options: CLIOptions
): Promise<ProjectConfig> {
  // 1. Get project name
  const name = await promptProjectName(projectName);

  // 2. If --template flag is provided, load that preset
  if (options.template) {
    const config = await loadPresetByName(options.template);
    const packageManager = await promptPackageManager();
    return {
      ...config,
      projectName: name,
      appScheme: deriveAppScheme(name),
      packageManager,
    };
  }

  // 3. If --defaults flag, use minimal preset
  if (options.defaults) {
    const config = await loadPresetByName('minimal');
    return {
      ...config,
      projectName: name,
      appScheme: deriveAppScheme(name),
      packageManager: 'npm',
    };
  }

  // 4. Interactive mode: Select preset or custom
  let config = await selectPreset();

  // 5. If custom selected, collect full configuration
  if (!config) {
    config = await collectCustomConfiguration();
  } else {
    // Ask if user wants to customize the preset
    config = await customizePreset(config);
  }

  // 6. Get package manager
  const packageManager = await promptPackageManager();

  return {
    ...config,
    projectName: name,
    appScheme: deriveAppScheme(name),
    packageManager,
  };
}

async function collectCustomConfiguration(): Promise<
  Omit<ProjectConfig, 'projectName' | 'packageManager' | 'appScheme'>
> {
  // Platform selection FIRST (foundational choice)
  const platforms = await promptPlatforms();

  const hasMobile = platforms.includes('mobile');

  // ORM selection (foundational choice)
  const orm = await promptORM();

  // Collect features (with platform awareness)
  const features = await promptFeatures(platforms);

  // Collect SDK integrations only for mobile
  const integrations = hasMobile
    ? await promptSDKs()
    : getDefaultIntegrations();

  // If onboarding enabled AND mobile platform, collect onboarding config
  if (features.onboarding.enabled && hasMobile) {
    const onboardingConfig = await promptOnboarding(integrations.revenueCat.enabled);
    features.onboarding = { ...features.onboarding, ...onboardingConfig };
  }

  // Auto-enable ATT if Adjust is enabled
  if (integrations.adjust.enabled) {
    integrations.att.enabled = true;
  }

  return {
    platforms,
    features,
    integrations,
    backend: {
      database: 'postgresql',
      orm,
      eventQueue: true,
      docker: true,
    },
    preset: 'custom',
    customized: false,
  };
}

/**
 * Returns default (disabled) integrations for web-only projects.
 */
function getDefaultIntegrations() {
  return {
    revenueCat: {
      enabled: false,
      iosKey: '',
      androidKey: '',
    },
    adjust: {
      enabled: false,
      appToken: '',
      environment: 'sandbox' as const,
    },
    scate: {
      enabled: false,
      apiKey: '',
    },
    att: {
      enabled: false,
    },
  };
}

async function loadPresetByName(
  presetName: string
): Promise<Omit<ProjectConfig, 'projectName' | 'packageManager' | 'appScheme'>> {
  const preset = PRESETS.find(
    (p) => p.name.toLowerCase() === presetName.toLowerCase()
  );

  if (!preset) {
    throw new Error(
      `Unknown preset: ${presetName}. Available: minimal, full-featured, analytics-focused`
    );
  }

  return preset.config;
}
