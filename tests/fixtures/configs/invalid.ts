import type { ProjectConfig } from '../../../src/types/index.js';
import { minimalConfig } from './minimal.js';

export const invalidConfigs = {
  paywallWithoutRevenueCat: {
    ...minimalConfig,
    features: { ...minimalConfig.features, paywall: true },
    integrations: { ...minimalConfig.integrations, revenueCat: { enabled: false, iosKey: '', androidKey: '' } },
  } as ProjectConfig,

  onboardingTooManyPages: {
    ...minimalConfig,
    features: { ...minimalConfig.features, onboarding: { enabled: true, pages: 10, skipButton: false, showPaywall: false } },
  } as ProjectConfig,

  emptyProjectName: {
    ...minimalConfig,
    projectName: '',
  } as ProjectConfig,

  invalidPackageManager: {
    ...minimalConfig,
    packageManager: 'invalid' as any,
  } as ProjectConfig,
};
