import type { ProjectConfig } from '../../../src/types/index.js';

export { minimalConfig } from './minimal.js';
export { fullFeaturedConfig } from './full-featured.js';
export { analyticsFocusedConfig } from './analytics-focused.js';
export { mobileOnlyConfig } from './mobile-only.js';
export { webOnlyConfig } from './web-only.js';
export { webWithOAuthConfig } from './web-with-oauth.js';
export { webMinimalConfig } from './web-minimal.js';
export { invalidConfigs } from './invalid.js';

import { minimalConfig } from './minimal.js';

// Legacy shallow merge (keep for backward compatibility)
export const createCustomConfig = (overrides: Partial<ProjectConfig>): ProjectConfig => {
  return { ...minimalConfig, ...overrides };
};

/**
 * Create a test config with deep merging support for nested objects.
 * This properly handles features, integrations, and backend overrides.
 */
export function createTestConfig(
  overrides: Partial<ProjectConfig> & {
    features?: Partial<ProjectConfig['features']> & {
      onboarding?: Partial<ProjectConfig['features']['onboarding']>;
      authentication?: Partial<ProjectConfig['features']['authentication']> & {
        providers?: Partial<ProjectConfig['features']['authentication']['providers']>;
      };
    };
    integrations?: Partial<ProjectConfig['integrations']> & {
      revenueCat?: Partial<ProjectConfig['integrations']['revenueCat']>;
      adjust?: Partial<ProjectConfig['integrations']['adjust']>;
      scate?: Partial<ProjectConfig['integrations']['scate']>;
      att?: Partial<ProjectConfig['integrations']['att']>;
    };
    backend?: Partial<ProjectConfig['backend']>;
  } = {}
): ProjectConfig {
  return {
    ...minimalConfig,
    ...overrides,
    features: {
      ...minimalConfig.features,
      ...overrides.features,
      onboarding: {
        ...minimalConfig.features.onboarding,
        ...overrides.features?.onboarding,
      },
      authentication: {
        ...minimalConfig.features.authentication,
        ...overrides.features?.authentication,
        providers: {
          ...minimalConfig.features.authentication.providers,
          ...overrides.features?.authentication?.providers,
        },
      },
      paywall: overrides.features?.paywall ?? minimalConfig.features.paywall,
      sessionManagement: overrides.features?.sessionManagement ?? minimalConfig.features.sessionManagement,
    },
    integrations: {
      ...minimalConfig.integrations,
      ...overrides.integrations,
      revenueCat: {
        ...minimalConfig.integrations.revenueCat,
        ...overrides.integrations?.revenueCat,
      },
      adjust: {
        ...minimalConfig.integrations.adjust,
        ...overrides.integrations?.adjust,
      },
      scate: {
        ...minimalConfig.integrations.scate,
        ...overrides.integrations?.scate,
      },
      att: {
        ...minimalConfig.integrations.att,
        ...overrides.integrations?.att,
      },
    },
    backend: {
      ...minimalConfig.backend,
      ...overrides.backend,
    },
  };
}
