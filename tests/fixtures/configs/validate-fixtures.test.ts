import { describe, it, expect } from 'vitest';
import { validateConfiguration } from '../../../src/utils/validation.js';
import { minimalConfig, fullFeaturedConfig, analyticsFocusedConfig, invalidConfigs } from './index.js';

/**
 * Ensure test fixtures stay in sync with ProjectConfig schema
 */
describe('Fixture Validation', () => {
  it('minimalConfig should be valid', () => {
    const result = validateConfiguration(minimalConfig);
    expect(result.valid).toBe(true);
  });

  it('fullFeaturedConfig should be valid', () => {
    const result = validateConfiguration(fullFeaturedConfig);
    expect(result.valid).toBe(true);
  });

  it('analyticsFocusedConfig should be valid', () => {
    const result = validateConfiguration(analyticsFocusedConfig);
    expect(result.valid).toBe(true);
  });

  it('invalidConfigs should fail validation', () => {
    expect(validateConfiguration(invalidConfigs.paywallWithoutRevenueCat).valid).toBe(false);
    expect(validateConfiguration(invalidConfigs.onboardingTooManyPages).valid).toBe(false);
    expect(validateConfiguration(invalidConfigs.emptyProjectName).valid).toBe(false);
    expect(validateConfiguration(invalidConfigs.invalidPackageManager).valid).toBe(false);
  });
});
