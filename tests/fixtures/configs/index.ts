import type { ProjectConfig } from '../../../src/types/index.js';

export { minimalConfig } from './minimal.js';
export { fullFeaturedConfig } from './full-featured.js';
export { analyticsFocusedConfig } from './analytics-focused.js';
export { mobileOnlyConfig } from './mobile-only.js';
export { webOnlyConfig } from './web-only.js';
export { invalidConfigs } from './invalid.js';

// Helper to create custom configs
import { minimalConfig } from './minimal.js';
export const createCustomConfig = (overrides: Partial<ProjectConfig>): ProjectConfig => {
  return { ...minimalConfig, ...overrides };
};
