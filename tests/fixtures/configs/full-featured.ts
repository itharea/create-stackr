import type { InitConfig } from '../../../src/types/index.js';
import { deriveAppScheme } from '../../../src/types/index.js';
import { loadPreset } from '../../../src/config/presets.js';

/**
 * Full-featured InitConfig fixture. Mirrors `loadPreset('full-featured')`
 * with project name / package manager / appScheme filled in, so tests can
 * pass it directly into generators without running the prompt layer.
 */
const projectName = 'test-full-featured';

export const fullFeaturedConfig: Readonly<InitConfig> = {
  ...loadPreset('full-featured'),
  projectName,
  packageManager: 'npm',
  appScheme: deriveAppScheme(projectName),
};
