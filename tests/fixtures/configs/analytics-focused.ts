import type { InitConfig } from '../../../src/types/index.js';
import { deriveAppScheme } from '../../../src/types/index.js';
import { loadPreset } from '../../../src/config/presets.js';

/**
 * Analytics-focused InitConfig fixture. Mirrors
 * `loadPreset('analytics-focused')` with project name / package manager /
 * appScheme filled in.
 */
const projectName = 'test-analytics-focused';

export const analyticsFocusedConfig: Readonly<InitConfig> = {
  ...loadPreset('analytics-focused'),
  projectName,
  packageManager: 'npm',
  appScheme: deriveAppScheme(projectName),
};
