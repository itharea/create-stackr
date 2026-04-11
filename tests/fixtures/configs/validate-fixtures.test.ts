import { describe, it, expect } from 'vitest';
import { validateConfiguration } from '../../../src/utils/validation.js';
import { minimalConfig } from './minimal.js';
import { fullFeaturedConfig } from './full-featured.js';
import { analyticsFocusedConfig } from './analytics-focused.js';
import { multiServiceConfig } from './multi-service.js';
import { drizzleConfig } from './drizzle-config.js';
import { invalidCases } from './invalid.js';

/**
 * Guard test — ensures fixtures do not silently drift. Every "valid"
 * fixture must pass `validateConfiguration`, and every invalid fixture
 * must fail with the expected error substring.
 */
describe('fixture validation', () => {
  const validFixtures = {
    minimal: minimalConfig,
    'full-featured': fullFeaturedConfig,
    'analytics-focused': analyticsFocusedConfig,
    'multi-service': multiServiceConfig,
    drizzle: drizzleConfig,
  };

  for (const [fixtureName, config] of Object.entries(validFixtures)) {
    it(`${fixtureName} fixture passes validateConfiguration`, () => {
      const result = validateConfiguration(config);
      expect(result.valid, `${fixtureName}: ${result.error ?? ''}`).toBe(true);
    });
  }

  for (const [key, invalid] of Object.entries(invalidCases)) {
    it(`${key} fixture fails validateConfiguration with "${invalid.expectedError}"`, () => {
      const result = validateConfiguration(invalid.config);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain(invalid.expectedError);
    });
  }
});
