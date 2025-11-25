import { describe, it, expect } from 'vitest';
import { shouldIncludeFile, isTemplate, getDestinationPath, renderTemplate } from '../../src/utils/template.js';
import type { ProjectConfig } from '../../src/types/index.js';

describe('Template Utils', () => {
  const mockConfig: ProjectConfig = {
    projectName: 'test-app',
    packageManager: 'npm',
    features: {
      onboarding: { enabled: true, pages: 3, skipButton: true, showPaywall: false },
      authentication: true,
      paywall: false,
      sessionManagement: true,
      tabs: true,
    },
    integrations: {
      revenueCat: { enabled: false, iosKey: '', androidKey: '' },
      adjust: { enabled: false, appToken: '', environment: 'sandbox' },
      scate: { enabled: false, apiKey: '' },
      att: { enabled: false },
    },
    backend: {
      database: 'postgresql',
      eventQueue: false,
      docker: true,
    },
    preset: 'custom',
    customized: false,
  };

  describe('shouldIncludeFile', () => {
    it('should include onboarding files when enabled', () => {
      expect(shouldIncludeFile('features/onboarding/app/page.tsx', mockConfig)).toBe(true);
    });

    it('should exclude onboarding files when disabled', () => {
      const config = {
        ...mockConfig,
        features: {
          ...mockConfig.features,
          onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false }
        }
      };
      expect(shouldIncludeFile('features/onboarding/app/page.tsx', config)).toBe(false);
    });

    it('should exclude RevenueCat files when disabled', () => {
      expect(shouldIncludeFile('integrations/revenuecat/services/revenuecatService.ts', mockConfig)).toBe(false);
    });

    it('should include RevenueCat files when enabled', () => {
      const config = {
        ...mockConfig,
        integrations: {
          ...mockConfig.integrations,
          revenueCat: { enabled: true, iosKey: 'test', androidKey: 'test' }
        }
      };
      expect(shouldIncludeFile('integrations/revenuecat/services/revenuecatService.ts', config)).toBe(true);
    });

    it('should include base files always', () => {
      expect(shouldIncludeFile('base/mobile/src/constants/Theme.ts', mockConfig)).toBe(true);
    });

    it('should exclude event queue files when disabled', () => {
      const config = {
        ...mockConfig,
        backend: {
          ...mockConfig.backend,
          eventQueue: false
        }
      };
      expect(shouldIncludeFile('base/backend/controllers/event-queue/index.ts', config)).toBe(false);
      expect(shouldIncludeFile('base/backend/controllers/event-queue/workers/user.ts', config)).toBe(false);
    });

    it('should include event queue files when enabled', () => {
      const config = {
        ...mockConfig,
        backend: {
          ...mockConfig.backend,
          eventQueue: true
        }
      };
      expect(shouldIncludeFile('base/backend/controllers/event-queue/index.ts', config)).toBe(true);
      expect(shouldIncludeFile('base/backend/controllers/event-queue/workers/user.ts', config)).toBe(true);
    });
  });

  describe('isTemplate', () => {
    it('should identify EJS templates', () => {
      expect(isTemplate('package.json.ejs')).toBe(true);
      expect(isTemplate('app.json.ejs')).toBe(true);
    });

    it('should identify non-templates', () => {
      expect(isTemplate('package.json')).toBe(false);
      expect(isTemplate('Theme.ts')).toBe(false);
    });
  });

  describe('getDestinationPath', () => {
    it('should map base/mobile to mobile', () => {
      const result = getDestinationPath('base/mobile/package.json.ejs', '/target');
      expect(result).toBe('/target/mobile/package.json');
    });

    it('should map base/backend to backend', () => {
      const result = getDestinationPath('base/backend/package.json.ejs', '/target');
      expect(result).toBe('/target/backend/package.json');
    });

    it('should map features to mobile/app', () => {
      const result = getDestinationPath('features/onboarding/app/page.tsx', '/target');
      expect(result).toBe('/target/mobile/app/page.tsx');
    });

    it('should map features services to mobile/src/services', () => {
      const result = getDestinationPath('features/auth/services/auth.ts', '/target');
      expect(result).toBe('/target/mobile/src/services/auth.ts');
    });

    it('should map integrations to mobile/src', () => {
      const result = getDestinationPath('integrations/revenuecat/services/revenuecatService.ts', '/target');
      expect(result).toBe('/target/mobile/src/services/revenuecatService.ts');
    });

    it('should map shared to root', () => {
      const result = getDestinationPath('shared/README.md.ejs', '/target');
      expect(result).toBe('/target/README.md');
    });

    it('should remove .ejs extension', () => {
      const result = getDestinationPath('base/mobile/app.json.ejs', '/target');
      expect(result).toBe('/target/mobile/app.json');
    });
  });

  describe('JSON template validation', () => {
    it('should render valid JSON from mobile package.json.ejs', async () => {
      const rendered = await renderTemplate('base/mobile/package.json.ejs', mockConfig);
      expect(() => JSON.parse(rendered)).not.toThrow();
      const parsed = JSON.parse(rendered);
      expect(parsed.name).toBe('test-app-mobile');
      expect(parsed.dependencies).toBeDefined();
    });

    it('should render valid JSON from backend package.json.ejs', async () => {
      const rendered = await renderTemplate('base/backend/package.json.ejs', mockConfig);
      expect(() => JSON.parse(rendered)).not.toThrow();
      const parsed = JSON.parse(rendered);
      expect(parsed.name).toBe('test-app-backend');
      expect(parsed.type).toBe('module');
    });

    it('should render valid JSON from app.json.ejs', async () => {
      const rendered = await renderTemplate('base/mobile/app.json.ejs', mockConfig);
      expect(() => JSON.parse(rendered)).not.toThrow();
      const parsed = JSON.parse(rendered);
      expect(parsed.expo).toBeDefined();
      expect(parsed.expo.name).toBe('test-app');
    });

    it('should render valid JSON from eas.json.ejs', async () => {
      const rendered = await renderTemplate('base/mobile/eas.json.ejs', mockConfig);
      expect(() => JSON.parse(rendered)).not.toThrow();
      const parsed = JSON.parse(rendered);
      expect(parsed.build).toBeDefined();
      expect(parsed.build.production).toBeDefined();
    });

    it('should include conditional dependencies in package.json when features enabled', async () => {
      const configWithRevenueCat = {
        ...mockConfig,
        integrations: {
          ...mockConfig.integrations,
          revenueCat: { enabled: true, iosKey: 'test-ios', androidKey: 'test-android' }
        }
      };
      const rendered = await renderTemplate('base/mobile/package.json.ejs', configWithRevenueCat);
      const parsed = JSON.parse(rendered);
      expect(parsed.dependencies['react-native-purchases']).toBeDefined();
    });

    it('should exclude conditional dependencies when features disabled', async () => {
      const rendered = await renderTemplate('base/mobile/package.json.ejs', mockConfig);
      const parsed = JSON.parse(rendered);
      expect(parsed.dependencies['react-native-purchases']).toBeUndefined();
    });

    describe('app.json extra configuration', () => {
      it('should always include features in extra section', async () => {
        const rendered = await renderTemplate('base/mobile/app.json.ejs', mockConfig);
        const parsed = JSON.parse(rendered);
        expect(parsed.expo.extra.features).toBeDefined();
        expect(parsed.expo.extra.features.onboarding.enabled).toBe(true);
        expect(parsed.expo.extra.features.authentication).toBe(true);
        expect(parsed.expo.extra.features.paywall).toBe(false);
        expect(parsed.expo.extra.features.tabs).toBe(true);
      });

      it('should include revenueCat config in extra when enabled', async () => {
        const configWithRevenueCat = {
          ...mockConfig,
          integrations: {
            ...mockConfig.integrations,
            revenueCat: { enabled: true, iosKey: 'test-ios-key', androidKey: 'test-android-key' }
          }
        };
        const rendered = await renderTemplate('base/mobile/app.json.ejs', configWithRevenueCat);
        const parsed = JSON.parse(rendered);
        expect(parsed.expo.extra.revenueCat).toBeDefined();
        expect(parsed.expo.extra.revenueCat.iosKey).toBe('test-ios-key');
        expect(parsed.expo.extra.revenueCat.androidKey).toBe('test-android-key');
      });

      it('should exclude revenueCat config in extra when disabled', async () => {
        const rendered = await renderTemplate('base/mobile/app.json.ejs', mockConfig);
        const parsed = JSON.parse(rendered);
        expect(parsed.expo.extra.revenueCat).toBeUndefined();
      });

      it('should include adjust config in extra when enabled', async () => {
        const configWithAdjust = {
          ...mockConfig,
          integrations: {
            ...mockConfig.integrations,
            adjust: { enabled: true, appToken: 'test-app-token', environment: 'production' }
          }
        };
        const rendered = await renderTemplate('base/mobile/app.json.ejs', configWithAdjust);
        const parsed = JSON.parse(rendered);
        expect(parsed.expo.extra.adjust).toBeDefined();
        expect(parsed.expo.extra.adjust.appToken).toBe('test-app-token');
        expect(parsed.expo.extra.adjust.environment).toBe('production');
      });

      it('should exclude adjust config in extra when disabled', async () => {
        const rendered = await renderTemplate('base/mobile/app.json.ejs', mockConfig);
        const parsed = JSON.parse(rendered);
        expect(parsed.expo.extra.adjust).toBeUndefined();
      });

      it('should include scate config in extra when enabled', async () => {
        const configWithScate = {
          ...mockConfig,
          integrations: {
            ...mockConfig.integrations,
            scate: { enabled: true, apiKey: 'test-scate-key' }
          }
        };
        const rendered = await renderTemplate('base/mobile/app.json.ejs', configWithScate);
        const parsed = JSON.parse(rendered);
        expect(parsed.expo.extra.scate).toBeDefined();
        expect(parsed.expo.extra.scate.apiKey).toBe('test-scate-key');
      });

      it('should exclude scate config in extra when disabled', async () => {
        const rendered = await renderTemplate('base/mobile/app.json.ejs', mockConfig);
        const parsed = JSON.parse(rendered);
        expect(parsed.expo.extra.scate).toBeUndefined();
      });

      it('should include multiple integration configs when all enabled', async () => {
        const configWithAllIntegrations = {
          ...mockConfig,
          integrations: {
            revenueCat: { enabled: true, iosKey: 'rc-ios', androidKey: 'rc-android' },
            adjust: { enabled: true, appToken: 'adj-token', environment: 'sandbox' },
            scate: { enabled: true, apiKey: 'scate-key' },
            att: { enabled: true },
          }
        };
        const rendered = await renderTemplate('base/mobile/app.json.ejs', configWithAllIntegrations);
        const parsed = JSON.parse(rendered);
        expect(parsed.expo.extra.revenueCat).toBeDefined();
        expect(parsed.expo.extra.adjust).toBeDefined();
        expect(parsed.expo.extra.scate).toBeDefined();
      });

      it('should include expo-tracking-transparency plugin when ATT enabled', async () => {
        const configWithATT = {
          ...mockConfig,
          integrations: {
            ...mockConfig.integrations,
            att: { enabled: true }
          }
        };
        const rendered = await renderTemplate('base/mobile/app.json.ejs', configWithATT);
        const parsed = JSON.parse(rendered);
        expect(parsed.expo.plugins).toContain('expo-tracking-transparency');
        expect(parsed.expo.ios.infoPlist).toBeDefined();
        expect(parsed.expo.ios.infoPlist.NSUserTrackingUsageDescription).toBeDefined();
      });

      it('should not include expo-tracking-transparency plugin when ATT disabled', async () => {
        const rendered = await renderTemplate('base/mobile/app.json.ejs', mockConfig);
        const parsed = JSON.parse(rendered);
        expect(parsed.expo.plugins).not.toContain('expo-tracking-transparency');
      });
    });
  });
});
