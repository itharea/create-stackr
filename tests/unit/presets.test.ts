import { describe, it, expect } from 'vitest';
import { PRESETS } from '../../src/config/presets.js';

describe('Presets', () => {
  it('should have all required presets', () => {
    expect(PRESETS).toHaveLength(3);
    expect(PRESETS.map((p) => p.name)).toEqual([
      'Minimal',
      'Full-Featured',
      'Analytics-Focused',
    ]);
  });

  it('should have valid preset names', () => {
    PRESETS.forEach((preset) => {
      expect(preset.name).toBeTruthy();
      expect(preset.name.length).toBeGreaterThan(0);
    });
  });

  it('should have descriptions for all presets', () => {
    PRESETS.forEach((preset) => {
      expect(preset.description).toBeTruthy();
      expect(preset.description.length).toBeGreaterThan(0);
    });
  });

  it('should have icons for all presets', () => {
    PRESETS.forEach((preset) => {
      expect(preset.icon).toBeTruthy();
    });
  });

  it('should have valid configurations', () => {
    PRESETS.forEach((preset) => {
      expect(preset.config.features).toBeDefined();
      expect(preset.config.integrations).toBeDefined();
      expect(preset.config.backend).toBeDefined();
      expect(preset.config.preset).toBeDefined();
    });
  });

  it('should have correct structure for features', () => {
    PRESETS.forEach((preset) => {
      expect(preset.config.features.onboarding).toBeDefined();
      expect(preset.config.features.authentication).toBeDefined();
      expect(preset.config.features.paywall).toBeDefined();
      expect(preset.config.features.sessionManagement).toBeDefined();
    });
  });

  it('should have correct structure for integrations', () => {
    PRESETS.forEach((preset) => {
      expect(preset.config.integrations.revenueCat).toBeDefined();
      expect(preset.config.integrations.adjust).toBeDefined();
      expect(preset.config.integrations.scate).toBeDefined();
      expect(preset.config.integrations.att).toBeDefined();
    });
  });

  it('Minimal preset should have minimal features', () => {
    const minimal = PRESETS.find((p) => p.name === 'Minimal');
    expect(minimal).toBeDefined();
    expect(minimal!.config.features.onboarding.enabled).toBe(false);
    expect(minimal!.config.features.paywall).toBe(false);
    expect(minimal!.config.integrations.revenueCat.enabled).toBe(false);
    expect(minimal!.config.integrations.adjust.enabled).toBe(false);
    expect(minimal!.config.integrations.scate.enabled).toBe(false);
  });

  it('Full-Featured preset should have all features', () => {
    const fullFeatured = PRESETS.find((p) => p.name === 'Full-Featured');
    expect(fullFeatured).toBeDefined();
    expect(fullFeatured!.config.features.onboarding.enabled).toBe(true);
    expect(fullFeatured!.config.features.paywall).toBe(true);
    expect(fullFeatured!.config.integrations.revenueCat.enabled).toBe(true);
    expect(fullFeatured!.config.integrations.adjust.enabled).toBe(true);
    expect(fullFeatured!.config.integrations.scate.enabled).toBe(true);
    expect(fullFeatured!.config.integrations.att.enabled).toBe(true);
  });

  it('Analytics-Focused preset should have analytics SDKs', () => {
    const analyticsFocused = PRESETS.find((p) => p.name === 'Analytics-Focused');
    expect(analyticsFocused).toBeDefined();
    expect(analyticsFocused!.config.integrations.adjust.enabled).toBe(true);
    expect(analyticsFocused!.config.integrations.scate.enabled).toBe(true);
    expect(analyticsFocused!.config.integrations.revenueCat.enabled).toBe(false);
  });
});
