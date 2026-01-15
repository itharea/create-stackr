import { describe, it, expect } from 'vitest';
import { validateConfiguration } from '../../src/utils/validation.js';
import { createTestConfig } from '../fixtures/configs/index.js';

describe('Configuration Conflict Detection', () => {
  describe('Paywall and RevenueCat dependency', () => {
    it('should reject paywall without RevenueCat on mobile', () => {
      const config = createTestConfig({
        platforms: ['mobile'],
        features: { paywall: true },
        integrations: { revenueCat: { enabled: false } },
      });

      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('RevenueCat');
    });

    it('should accept paywall with RevenueCat enabled', () => {
      const config = createTestConfig({
        platforms: ['mobile'],
        features: { paywall: true },
        integrations: { revenueCat: { enabled: true, iosKey: 'key', androidKey: 'key' } },
      });

      const result = validateConfiguration(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('Onboarding paywall and RevenueCat dependency', () => {
    it('should reject onboarding showPaywall without RevenueCat', () => {
      const config = createTestConfig({
        platforms: ['mobile'],
        features: {
          onboarding: { enabled: true, pages: 3, skipButton: true, showPaywall: true },
        },
        integrations: { revenueCat: { enabled: false } },
      });

      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('RevenueCat');
    });

    it('should accept onboarding showPaywall with RevenueCat enabled', () => {
      const config = createTestConfig({
        platforms: ['mobile'],
        features: {
          onboarding: { enabled: true, pages: 3, skipButton: true, showPaywall: true },
        },
        integrations: { revenueCat: { enabled: true, iosKey: 'key', androidKey: 'key' } },
      });

      const result = validateConfiguration(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('Platform-specific feature conflicts', () => {
    it('should reject all mobile-only integrations on web-only', () => {
      const mobileIntegrations = [
        { revenueCat: { enabled: true, iosKey: 'k', androidKey: 'k' } },
        { adjust: { enabled: true, appToken: 'token', environment: 'sandbox' as const } },
        { scate: { enabled: true, apiKey: 'key' } },
        { att: { enabled: true } },
      ];

      for (const integration of mobileIntegrations) {
        const config = createTestConfig({
          platforms: ['web'],
          integrations: integration,
        });

        const result = validateConfiguration(config);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('mobile platform');
      }
    });

    it('should accept mobile integrations on mobile+web projects', () => {
      const config = createTestConfig({
        platforms: ['mobile', 'web'],
        features: { paywall: true },
        integrations: {
          revenueCat: { enabled: true, iosKey: 'key', androidKey: 'key' },
          adjust: { enabled: true, appToken: 'token', environment: 'sandbox' },
        },
      });

      const result = validateConfiguration(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('Onboarding platform constraints', () => {
    it('should reject onboarding on web-only project', () => {
      const config = createTestConfig({
        platforms: ['web'],
        features: {
          onboarding: { enabled: true, pages: 3, skipButton: true, showPaywall: false },
        },
      });

      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mobile platform');
    });
  });
});
