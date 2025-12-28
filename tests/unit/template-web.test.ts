import { describe, it, expect } from 'vitest';
import { shouldIncludeFile, getDestinationPath } from '../../src/utils/template.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { mobileOnlyConfig } from '../fixtures/configs/mobile-only.js';
import { webOnlyConfig } from '../fixtures/configs/web-only.js';
import type { Platform, ProjectConfig } from '../../src/types/index.js';

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

    describe('web auth feature templates', () => {
      it('includes web auth templates when web platform and auth enabled', () => {
        const config: ProjectConfig = {
          ...webOnlyConfig,
          features: {
            ...webOnlyConfig.features,
            authentication: {
              enabled: true,
              providers: { emailPassword: true, google: false, apple: false, github: false },
              emailVerification: false,
              passwordReset: true,
              twoFactor: false,
            },
          },
        };
        expect(shouldIncludeFile('features/web/auth/app/(auth)/login/page.tsx.ejs', config)).toBe(true);
        expect(shouldIncludeFile('features/web/auth/app/(auth)/register/page.tsx.ejs', config)).toBe(true);
        expect(shouldIncludeFile('features/web/auth/components/auth/login-form.tsx.ejs', config)).toBe(true);
      });

      it('excludes web auth templates when auth disabled', () => {
        const config: ProjectConfig = {
          ...webOnlyConfig,
          features: {
            ...webOnlyConfig.features,
            authentication: {
              enabled: false,
              providers: { emailPassword: false, google: false, apple: false, github: false },
              emailVerification: false,
              passwordReset: false,
              twoFactor: false,
            },
          },
        };
        expect(shouldIncludeFile('features/web/auth/app/(auth)/login/page.tsx.ejs', config)).toBe(false);
      });

      it('excludes web auth templates when only mobile selected', () => {
        expect(shouldIncludeFile('features/web/auth/app/(auth)/login/page.tsx.ejs', mobileOnlyConfig)).toBe(false);
      });
    });

    describe('web OAuth templates', () => {
      it('includes OAuth templates when authentication enabled', () => {
        const config: ProjectConfig = {
          ...webOnlyConfig,
          features: {
            ...webOnlyConfig.features,
            authentication: {
              enabled: true,
              providers: { emailPassword: true, google: true, apple: false, github: false },
              emailVerification: false,
              passwordReset: true,
              twoFactor: false,
            },
          },
        };
        expect(shouldIncludeFile('features/web/auth/app/auth/callback/route.ts.ejs', config)).toBe(true);
        expect(shouldIncludeFile('features/web/auth/components/auth/oauth-buttons.tsx.ejs', config)).toBe(true);
      });

      // Note: OAuth components are included whenever auth is enabled.
      // The oauth-buttons.tsx component handles provider visibility internally via EJS conditionals.
      it('includes OAuth component files even with only email/password (conditional rendering is in EJS)', () => {
        const config: ProjectConfig = {
          ...webOnlyConfig,
          features: {
            ...webOnlyConfig.features,
            authentication: {
              enabled: true,
              providers: { emailPassword: true, google: false, apple: false, github: false },
              emailVerification: false,
              passwordReset: true,
              twoFactor: false,
            },
          },
        };
        // OAuth component files are always included when auth is enabled
        // The EJS template conditionally renders buttons based on provider config
        expect(shouldIncludeFile('features/web/auth/components/auth/oauth-buttons.tsx.ejs', config)).toBe(true);
      });
    });

    describe('web password reset templates', () => {
      it('includes password reset templates when enabled', () => {
        const config: ProjectConfig = {
          ...webOnlyConfig,
          features: {
            ...webOnlyConfig.features,
            authentication: {
              enabled: true,
              providers: { emailPassword: true, google: false, apple: false, github: false },
              emailVerification: false,
              passwordReset: true,
              twoFactor: false,
            },
          },
        };
        expect(shouldIncludeFile('features/web/auth/app/(auth)/forgot-password/page.tsx.ejs', config)).toBe(true);
        expect(shouldIncludeFile('features/web/auth/app/(auth)/reset-password/page.tsx.ejs', config)).toBe(true);
      });

      it('excludes password reset templates when disabled', () => {
        const config: ProjectConfig = {
          ...webOnlyConfig,
          features: {
            ...webOnlyConfig.features,
            authentication: {
              enabled: true,
              providers: { emailPassword: true, google: false, apple: false, github: false },
              emailVerification: false,
              passwordReset: false,
              twoFactor: false,
            },
          },
        };
        expect(shouldIncludeFile('features/web/auth/app/(auth)/forgot-password/page.tsx.ejs', config)).toBe(false);
        expect(shouldIncludeFile('features/web/auth/app/(auth)/reset-password/page.tsx.ejs', config)).toBe(false);
      });
    });

    describe('web email verification templates', () => {
      it('includes email verification when enabled', () => {
        const config: ProjectConfig = {
          ...webOnlyConfig,
          features: {
            ...webOnlyConfig.features,
            authentication: {
              enabled: true,
              providers: { emailPassword: true, google: false, apple: false, github: false },
              emailVerification: true,
              passwordReset: true,
              twoFactor: false,
            },
          },
        };
        expect(shouldIncludeFile('features/web/auth/app/(auth)/verify-email/page.tsx.ejs', config)).toBe(true);
      });

      it('excludes email verification when disabled', () => {
        expect(shouldIncludeFile('features/web/auth/app/(auth)/verify-email/page.tsx.ejs', webOnlyConfig)).toBe(false);
      });
    });

    describe('web session management templates', () => {
      // IMPORTANT: Session management pages are part of the web auth feature.
      // The `sessionManagement` config flag controls RUNTIME behavior (API permissions),
      // NOT file inclusion. Session pages are always generated when auth is enabled.
      it('includes session management templates when auth enabled', () => {
        expect(shouldIncludeFile('features/web/auth/app/(app)/settings/sessions/page.tsx.ejs', webOnlyConfig)).toBe(true);
        expect(shouldIncludeFile('features/web/auth/components/settings/session-card.tsx.ejs', webOnlyConfig)).toBe(true);
      });

      it('includes session templates even when sessionManagement flag is false (flag is for runtime, not generation)', () => {
        const config: ProjectConfig = {
          ...webOnlyConfig,
          features: {
            ...webOnlyConfig.features,
            sessionManagement: false, // This does NOT exclude session templates
          },
        };
        // Session pages are still included because auth is enabled
        expect(shouldIncludeFile('features/web/auth/app/(app)/settings/sessions/page.tsx.ejs', config)).toBe(true);
      });

      it('excludes session management templates when auth disabled', () => {
        const config: ProjectConfig = {
          ...webOnlyConfig,
          features: {
            ...webOnlyConfig.features,
            authentication: {
              ...webOnlyConfig.features.authentication,
              enabled: false,
            },
          },
        };
        expect(shouldIncludeFile('features/web/auth/app/(app)/settings/sessions/page.tsx.ejs', config)).toBe(false);
      });
    });

    describe('web base templates', () => {
      it('includes theme provider when web selected', () => {
        expect(shouldIncludeFile('base/web/src/components/providers/theme-provider.tsx', webOnlyConfig)).toBe(true);
      });

      it('includes UI components when web selected', () => {
        expect(shouldIncludeFile('base/web/src/components/ui/button.tsx', webOnlyConfig)).toBe(true);
        expect(shouldIncludeFile('base/web/src/components/ui/input.tsx', webOnlyConfig)).toBe(true);
        expect(shouldIncludeFile('base/web/src/components/ui/card.tsx', webOnlyConfig)).toBe(true);
      });

      it('includes Next.js config files when web selected', () => {
        expect(shouldIncludeFile('base/web/next.config.ts', webOnlyConfig)).toBe(true);
        expect(shouldIncludeFile('base/web/tsconfig.json', webOnlyConfig)).toBe(true);
        expect(shouldIncludeFile('base/web/postcss.config.mjs', webOnlyConfig)).toBe(true);
      });
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

  describe('getDestinationPath - web feature mappings', () => {
    it('maps features/web/auth/app/* to web/src/app/*', () => {
      const result = getDestinationPath('features/web/auth/app/(auth)/login/page.tsx', '/project');
      expect(result).toBe('/project/web/src/app/(auth)/login/page.tsx');
    });

    it('maps features/web/auth/components/* to web/src/components/*', () => {
      const result = getDestinationPath('features/web/auth/components/auth/login-form.tsx', '/project');
      expect(result).toBe('/project/web/src/components/auth/login-form.tsx');
    });

    it('removes .ejs extension from web feature templates', () => {
      const result = getDestinationPath('features/web/auth/app/(auth)/login/page.tsx.ejs', '/project');
      expect(result).toBe('/project/web/src/app/(auth)/login/page.tsx');
    });

    it('maps base/web/src/components/* correctly', () => {
      const result = getDestinationPath('base/web/src/components/ui/button.tsx', '/project');
      expect(result).toBe('/project/web/src/components/ui/button.tsx');
    });

    it('maps base/web/src/lib/* correctly', () => {
      const result = getDestinationPath('base/web/src/lib/utils.ts', '/project');
      expect(result).toBe('/project/web/src/lib/utils.ts');
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
