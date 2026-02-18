import validateNpmPackageName from 'validate-npm-package-name';
import type { ProjectConfig } from '../types/index.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateProjectName(name: string): ValidationResult {
  // Check if empty
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      error: 'Project name cannot be empty',
    };
  }

  // Check npm package name validity
  const npmValidation = validateNpmPackageName(name);
  if (!npmValidation.validForNewPackages) {
    const errors = [
      ...(npmValidation.errors || []),
      ...(npmValidation.warnings || []),
    ];
    return {
      valid: false,
      error: errors.join(', '),
    };
  }

  return { valid: true };
}

export function validateConfiguration(config: ProjectConfig): ValidationResult {
  // Validate project name
  const nameValidation = validateProjectName(config.projectName);
  if (!nameValidation.valid) {
    return nameValidation;
  }

  // Validate platforms
  if (!config.platforms || config.platforms.length === 0) {
    return {
      valid: false,
      error: 'At least one platform must be selected',
    };
  }

  const validPlatforms = ['mobile', 'web'];
  for (const platform of config.platforms) {
    if (!validPlatforms.includes(platform)) {
      return {
        valid: false,
        error: `Invalid platform: ${platform}. Must be one of: ${validPlatforms.join(', ')}`,
      };
    }
  }

  // Validate package manager
  const validPackageManagers = ['npm', 'yarn', 'bun'];
  if (!validPackageManagers.includes(config.packageManager)) {
    return {
      valid: false,
      error: 'Package manager must be one of: npm, yarn, bun',
    };
  }

  // Validate mobile-only features on web-only config
  // IMPORTANT: Check platform constraints BEFORE dependency constraints
  // so users see the more fundamental error first
  const hasMobile = config.platforms.includes('mobile');

  if (!hasMobile) {
    if (config.features.onboarding.enabled) {
      return {
        valid: false,
        error: 'Onboarding feature requires mobile platform',
      };
    }

    if (config.features.paywall) {
      return {
        valid: false,
        error: 'Paywall feature requires mobile platform',
      };
    }

    if (config.integrations.revenueCat.enabled) {
      return {
        valid: false,
        error: 'RevenueCat integration requires mobile platform',
      };
    }

    if (config.integrations.adjust.enabled) {
      return {
        valid: false,
        error: 'Adjust integration requires mobile platform',
      };
    }

    if (config.integrations.scate.enabled) {
      return {
        valid: false,
        error: 'Scate integration requires mobile platform',
      };
    }

    if (config.integrations.att.enabled) {
      return {
        valid: false,
        error: 'ATT integration requires mobile platform',
      };
    }
  }

  // Validate paywall requires RevenueCat (only relevant when mobile platform is included)
  if (config.features.paywall && !config.integrations.revenueCat.enabled) {
    return {
      valid: false,
      error: 'Paywall feature requires RevenueCat integration',
    };
  }

  // Validate onboarding pages
  if (config.features.onboarding.enabled) {
    const pages = config.features.onboarding.pages;
    if (pages < 1 || pages > 5) {
      return {
        valid: false,
        error: 'Onboarding pages must be between 1 and 5',
      };
    }
  }

  // Validate onboarding paywall requires RevenueCat
  if (
    config.features.onboarding.showPaywall &&
    !config.integrations.revenueCat.enabled
  ) {
    return {
      valid: false,
      error: 'Onboarding paywall requires RevenueCat integration',
    };
  }

  return { valid: true };
}
