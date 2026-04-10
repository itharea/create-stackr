import type { InitConfig } from '../../../src/types/index.js';
import { minimalConfig } from './minimal.js';
import { cloneInitConfig } from './index.js';

/**
 * Minimal config with ORM flipped to drizzle. Used by tests that assert
 * the prisma/drizzle path-splitting logic in `shouldIncludeFile` and
 * `getDestinationPath` still works per service.
 */
export const drizzleConfig: Readonly<InitConfig> = (() => {
  const cloned = cloneInitConfig(minimalConfig);
  cloned.projectName = 'test-drizzle';
  cloned.appScheme = 'testdrizzle';
  cloned.orm = 'drizzle';
  return cloned;
})();
