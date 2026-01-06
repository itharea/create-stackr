import { describe, it, expect } from 'vitest';
import { validateProjectName, validateConfiguration } from '../../src/utils/validation.js';
import type { ProjectConfig } from '../../src/types/index.js';

describe('validateProjectName', () => {
  it('should accept valid names', () => {
    expect(validateProjectName('my-app').valid).toBe(true);
    expect(validateProjectName('my-app-123').valid).toBe(true);
    expect(validateProjectName('test').valid).toBe(true);
    expect(validateProjectName('a').valid).toBe(true);
  });

  it('should reject empty names', () => {
    expect(validateProjectName('').valid).toBe(false);
    expect(validateProjectName('   ').valid).toBe(false);
  });

  it('should reject names with uppercase letters', () => {
    expect(validateProjectName('MyApp').valid).toBe(false);
    expect(validateProjectName('my-App').valid).toBe(false);
  });

  it('should reject names with spaces', () => {
    expect(validateProjectName('my app').valid).toBe(false);
    expect(validateProjectName('my  app').valid).toBe(false);
  });

  it('should reject names with underscores', () => {
    expect(validateProjectName('my_app').valid).toBe(false);
  });

  it('should reject names that are too long', () => {
    expect(validateProjectName('a'.repeat(215)).valid).toBe(false);
  });

  it('should reject names with special characters', () => {
    expect(validateProjectName('my@app').valid).toBe(false);
    expect(validateProjectName('my#app').valid).toBe(false);
  });
});

describe('validateConfiguration', () => {
  const createValidConfig = (): ProjectConfig => ({
    projectName: 'test-app',
    packageManager: 'npm',
    appScheme: 'testapp',
    platforms: ['mobile', 'web'],
    features: {
      onboarding: {
        enabled: false,
        pages: 0,
        skipButton: false,
        showPaywall: false,
      },
      authentication: {
        enabled: true,
        providers: {
          emailPassword: true,
          google: false,
          apple: false,
          github: false,
        },
        emailVerification: false,
        passwordReset: true,
        twoFactor: false,
      },
      paywall: false,
      sessionManagement: true,
    },
    integrations: {
      revenueCat: {
        enabled: false,
        iosKey: '',
        androidKey: '',
      },
      adjust: {
        enabled: false,
        appToken: '',
        environment: 'sandbox',
      },
      scate: {
        enabled: false,
        apiKey: '',
      },
      att: {
        enabled: false,
      },
    },
    backend: {
      database: 'postgresql',
      orm: 'prisma',
      eventQueue: false,
      docker: true,
    },
    preset: 'minimal',
    customized: false,
  });

  it('should accept valid configuration', () => {
    const config = createValidConfig();
    expect(validateConfiguration(config).valid).toBe(true);
  });

  it('should reject paywall without RevenueCat', () => {
    const config = createValidConfig();
    config.features.paywall = true;
    config.integrations.revenueCat.enabled = false;
    expect(validateConfiguration(config).valid).toBe(false);
  });

  it('should accept paywall with RevenueCat enabled', () => {
    const config = createValidConfig();
    config.features.paywall = true;
    config.integrations.revenueCat.enabled = true;
    expect(validateConfiguration(config).valid).toBe(true);
  });

  it('should reject onboarding pages < 1', () => {
    const config = createValidConfig();
    config.features.onboarding.enabled = true;
    config.features.onboarding.pages = 0;
    expect(validateConfiguration(config).valid).toBe(false);
  });

  it('should reject onboarding pages > 5', () => {
    const config = createValidConfig();
    config.features.onboarding.enabled = true;
    config.features.onboarding.pages = 6;
    expect(validateConfiguration(config).valid).toBe(false);
  });

  it('should accept valid onboarding pages (1-5)', () => {
    const config = createValidConfig();
    config.features.onboarding.enabled = true;

    config.features.onboarding.pages = 1;
    expect(validateConfiguration(config).valid).toBe(true);

    config.features.onboarding.pages = 3;
    expect(validateConfiguration(config).valid).toBe(true);

    config.features.onboarding.pages = 5;
    expect(validateConfiguration(config).valid).toBe(true);
  });

  it('should reject onboarding paywall without RevenueCat', () => {
    const config = createValidConfig();
    config.features.onboarding.enabled = true;
    config.features.onboarding.showPaywall = true;
    config.integrations.revenueCat.enabled = false;
    expect(validateConfiguration(config).valid).toBe(false);
  });

  it('should accept onboarding paywall with RevenueCat', () => {
    const config = createValidConfig();
    config.features.onboarding.enabled = true;
    config.features.onboarding.pages = 3;
    config.features.onboarding.showPaywall = true;
    config.integrations.revenueCat.enabled = true;
    expect(validateConfiguration(config).valid).toBe(true);
  });

  describe('Mobile-only feature validation', () => {
    it('should reject paywall on web-only project', () => {
      const config = createValidConfig();
      config.platforms = ['web'];
      config.features.paywall = true;
      // Even with RevenueCat enabled, platform check fails first
      config.integrations.revenueCat.enabled = true;

      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mobile platform');
    });

    it('should reject RevenueCat on web-only project', () => {
      const config = createValidConfig();
      config.platforms = ['web'];
      config.integrations.revenueCat.enabled = true;

      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mobile platform');
    });

    it('should reject Adjust on web-only project', () => {
      const config = createValidConfig();
      config.platforms = ['web'];
      config.integrations.adjust.enabled = true;

      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mobile platform');
    });

    it('should reject Scate on web-only project', () => {
      const config = createValidConfig();
      config.platforms = ['web'];
      config.integrations.scate.enabled = true;

      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mobile platform');
    });

    it('should reject ATT on web-only project', () => {
      const config = createValidConfig();
      config.platforms = ['web'];
      config.integrations.att.enabled = true;

      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mobile platform');
    });

    it('should reject onboarding on web-only project', () => {
      const config = createValidConfig();
      config.platforms = ['web'];
      config.features.onboarding.enabled = true;
      config.features.onboarding.pages = 3;

      const result = validateConfiguration(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('mobile platform');
    });

    it('should accept mobile-only features on mobile project', () => {
      const config = createValidConfig();
      config.platforms = ['mobile'];
      config.features.paywall = true;
      config.features.onboarding.enabled = true;
      config.features.onboarding.pages = 3;
      config.integrations.revenueCat.enabled = true;
      config.integrations.adjust.enabled = true;
      config.integrations.att.enabled = true;

      const result = validateConfiguration(config);
      expect(result.valid).toBe(true);
    });

    it('should accept mobile-only features on mobile+web project', () => {
      const config = createValidConfig();
      config.platforms = ['mobile', 'web'];
      config.features.paywall = true;
      config.features.onboarding.enabled = true;
      config.features.onboarding.pages = 3;
      config.integrations.revenueCat.enabled = true;

      const result = validateConfiguration(config);
      expect(result.valid).toBe(true);
    });
  });
});
