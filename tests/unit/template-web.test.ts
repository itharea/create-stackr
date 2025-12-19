import { describe, it, expect } from 'vitest';
import { shouldIncludeFile, getDestinationPath } from '../../src/utils/template.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { mobileOnlyConfig } from '../fixtures/configs/mobile-only.js';
import { webOnlyConfig } from '../fixtures/configs/web-only.js';
import type { Platform } from '../../src/types/index.js';

describe('Web Template Utilities', () => {
  describe('shouldIncludeFile - platform filtering', () => {
    it('includes web templates when web platform selected', () => {
      const config = { ...minimalConfig, platforms: ['web'] as Platform[] };
      expect(shouldIncludeFile('base/web/package.json.ejs', config)).toBe(true);
      expect(shouldIncludeFile('base/web/src/app/page.tsx', config)).toBe(true);
    });

    it('excludes web templates when only mobile selected', () => {
      expect(shouldIncludeFile('base/web/package.json.ejs', mobileOnlyConfig)).toBe(false);
      expect(shouldIncludeFile('base/web/src/app/page.tsx', mobileOnlyConfig)).toBe(false);
    });

    it('includes mobile templates when mobile platform selected', () => {
      const config = { ...minimalConfig, platforms: ['mobile'] as Platform[] };
      expect(shouldIncludeFile('base/mobile/package.json.ejs', config)).toBe(true);
    });

    it('excludes mobile templates when only web selected', () => {
      expect(shouldIncludeFile('base/mobile/package.json.ejs', webOnlyConfig)).toBe(false);
    });

    it('includes both when both platforms selected', () => {
      const config = { ...minimalConfig, platforms: ['mobile', 'web'] as Platform[] };
      expect(shouldIncludeFile('base/mobile/package.json.ejs', config)).toBe(true);
      expect(shouldIncludeFile('base/web/package.json.ejs', config)).toBe(true);
    });

    // Tests for new /mobile/ structure in features and integrations
    it('includes mobile features when mobile platform selected', () => {
      const config = {
        ...minimalConfig,
        platforms: ['mobile'] as Platform[],
        features: {
          ...minimalConfig.features,
          onboarding: { enabled: true, pages: 3, skipButton: true, showPaywall: false },
        }
      };
      expect(shouldIncludeFile('features/mobile/auth/app/login.tsx', config)).toBe(true);
      expect(shouldIncludeFile('features/mobile/onboarding/app/onboarding.tsx', config)).toBe(true);
    });

    it('excludes mobile features when only web selected', () => {
      expect(shouldIncludeFile('features/mobile/auth/app/login.tsx', webOnlyConfig)).toBe(false);
      expect(shouldIncludeFile('integrations/mobile/revenuecat/services/purchases.ts', webOnlyConfig)).toBe(false);
    });

    it('includes mobile integrations when mobile platform selected', () => {
      const config = {
        ...minimalConfig,
        platforms: ['mobile'] as Platform[],
        integrations: {
          ...minimalConfig.integrations,
          adjust: { enabled: true, appToken: 'test', environment: 'sandbox' as const },
          revenueCat: { enabled: true, iosKey: 'test', androidKey: 'test' },
        }
      };
      expect(shouldIncludeFile('integrations/mobile/adjust/services/adjust.ts', config)).toBe(true);
      expect(shouldIncludeFile('integrations/mobile/revenuecat/services/purchases.ts', config)).toBe(true);
    });

    it('always includes backend templates regardless of platform', () => {
      expect(shouldIncludeFile('base/backend/server.ts', webOnlyConfig)).toBe(true);
      expect(shouldIncludeFile('base/backend/server.ts', mobileOnlyConfig)).toBe(true);
    });

    it('always includes shared templates regardless of platform', () => {
      expect(shouldIncludeFile('shared/README.md.ejs', webOnlyConfig)).toBe(true);
      expect(shouldIncludeFile('shared/README.md.ejs', mobileOnlyConfig)).toBe(true);
    });
  });

  describe('getDestinationPath - web mappings', () => {
    it('maps base/web/* to web/*', () => {
      const result = getDestinationPath('base/web/package.json', '/project');
      expect(result).toBe('/project/web/package.json');
    });

    it('maps base/web/src/* to web/src/*', () => {
      const result = getDestinationPath('base/web/src/app/page.tsx', '/project');
      expect(result).toBe('/project/web/src/app/page.tsx');
    });

    it('removes .ejs extension from web templates', () => {
      const result = getDestinationPath('base/web/package.json.ejs', '/project');
      expect(result).toBe('/project/web/package.json');
    });
  });

  describe('getDestinationPath - mobile feature/integration mappings', () => {
    it('maps features/mobile/*/app/* to mobile/app/*', () => {
      const result = getDestinationPath('features/mobile/auth/app/login.tsx', '/project');
      expect(result).toBe('/project/mobile/app/login.tsx');
    });

    it('maps features/mobile/*/services/* to mobile/src/services/*', () => {
      const result = getDestinationPath('features/mobile/auth/services/auth.ts', '/project');
      expect(result).toBe('/project/mobile/src/services/auth.ts');
    });

    it('maps integrations/mobile/*/services/* to mobile/src/services/*', () => {
      const result = getDestinationPath('integrations/mobile/adjust/services/adjust.ts', '/project');
      expect(result).toBe('/project/mobile/src/services/adjust.ts');
    });
  });
});
