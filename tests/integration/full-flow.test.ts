import { describe, it, expect, vi, beforeEach } from 'vitest';
import { collectConfiguration } from '../../src/prompts/index.js';
import type { CLIOptions } from '../../src/types/index.js';

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

describe('Integration Tests - Prompt Flows', () => {
  let inquirer: any;

  beforeEach(async () => {
    // Get the mocked inquirer
    inquirer = (await import('inquirer')).default;
    vi.clearAllMocks();
  });

  describe('--template flag behavior', () => {
    it('should load minimal preset with --template minimal', async () => {
      // Mock package manager prompt only
      inquirer.prompt.mockResolvedValueOnce({ packageManager: 'npm' });

      const options: CLIOptions = { template: 'minimal' };
      const config = await collectConfiguration('test-app', options);

      expect(config.projectName).toBe('test-app');
      expect(config.packageManager).toBe('npm');
      expect(config.preset).toBe('minimal');
      expect(config.features.onboarding.enabled).toBe(false);
      expect(config.integrations.revenueCat.enabled).toBe(false);
      expect(config.integrations.adjust.enabled).toBe(false);
    });

    it('should load full-featured preset with --template full-featured', async () => {
      inquirer.prompt.mockResolvedValueOnce({ packageManager: 'yarn' });

      const options: CLIOptions = { template: 'full-featured' };
      const config = await collectConfiguration('my-app', options);

      expect(config.projectName).toBe('my-app');
      expect(config.packageManager).toBe('yarn');
      expect(config.preset).toBe('full-featured');
      expect(config.features.onboarding.enabled).toBe(true);
      expect(config.features.onboarding.pages).toBe(3);
      expect(config.features.paywall).toBe(true);
      expect(config.integrations.revenueCat.enabled).toBe(true);
      expect(config.integrations.adjust.enabled).toBe(true);
      expect(config.integrations.scate.enabled).toBe(true);
      expect(config.integrations.att.enabled).toBe(true);
    });

    it('should load analytics-focused preset with --template analytics-focused', async () => {
      inquirer.prompt.mockResolvedValueOnce({ packageManager: 'bun' });

      const options: CLIOptions = { template: 'analytics-focused' };
      const config = await collectConfiguration('analytics-app', options);

      expect(config.projectName).toBe('analytics-app');
      expect(config.packageManager).toBe('bun');
      expect(config.preset).toBe('analytics-focused');
      expect(config.features.onboarding.enabled).toBe(true);
      expect(config.features.onboarding.pages).toBe(2);
      expect(config.features.paywall).toBe(false);
      expect(config.integrations.revenueCat.enabled).toBe(false);
      expect(config.integrations.adjust.enabled).toBe(true);
      expect(config.integrations.scate.enabled).toBe(true);
      expect(config.integrations.att.enabled).toBe(true);
    });

    it('should throw error for unknown preset', async () => {
      const options: CLIOptions = { template: 'unknown-preset' };

      await expect(
        collectConfiguration('test-app', options)
      ).rejects.toThrow('Unknown preset: unknown-preset');
    });
  });

  describe('--defaults flag behavior', () => {
    it('should use minimal preset with npm when --defaults is set', async () => {
      const options: CLIOptions = { defaults: true };
      const config = await collectConfiguration('default-app', options);

      expect(config.projectName).toBe('default-app');
      expect(config.packageManager).toBe('npm');
      expect(config.preset).toBe('minimal');
      expect(config.features.authentication.enabled).toBe(true);
      expect(config.features.onboarding.enabled).toBe(false);
      expect(config.features.paywall).toBe(false);
    });

    it('should not prompt user when --defaults is set', async () => {
      const options: CLIOptions = { defaults: true };
      await collectConfiguration('test-app', options);

      // Should not call inquirer.prompt at all (except project name if not provided)
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });
  });

  describe('Interactive preset selection', () => {
    it('should allow selecting a preset and not customizing it', async () => {
      // Mock preset selection
      inquirer.prompt
        .mockResolvedValueOnce({ preset: 'Minimal' }) // Select preset
        .mockResolvedValueOnce({ customize: false }) // Don't customize
        .mockResolvedValueOnce({ packageManager: 'npm' }); // Package manager

      const options: CLIOptions = {};
      const config = await collectConfiguration('my-app', options);

      expect(config.preset).toBe('minimal');
      expect(config.customized).toBe(false);
    });

    it('should allow customizing a preset', async () => {
      // Mock preset selection and customization
      inquirer.prompt
        .mockResolvedValueOnce({ preset: 'Minimal' }) // Select preset
        .mockResolvedValueOnce({ customize: true }) // Customize
        .mockResolvedValueOnce({
          // Customization answers
          onboarding: true,
          onboardingPages: 4,
          paywall: true,
          revenueCat: true,
          adjust: true,
          scate: false,
          oauthProviders: ['google', 'apple'], // OAuth provider selection
        })
        .mockResolvedValueOnce({ packageManager: 'npm' }); // Package manager

      const options: CLIOptions = {};
      const config = await collectConfiguration('custom-app', options);

      expect(config.preset).toBe('minimal');
      expect(config.customized).toBe(true);
      expect(config.features.onboarding.enabled).toBe(true);
      expect(config.features.onboarding.pages).toBe(4);
      expect(config.features.paywall).toBe(true);
      expect(config.features.authentication.providers.google).toBe(true); // OAuth customized
      expect(config.features.authentication.providers.apple).toBe(true); // OAuth customized
      expect(config.features.authentication.providers.github).toBe(false); // Not selected
      expect(config.integrations.revenueCat.enabled).toBe(true);
      expect(config.integrations.adjust.enabled).toBe(true);
      expect(config.integrations.scate.enabled).toBe(false);
      expect(config.integrations.att.enabled).toBe(true); // Auto-enabled with Adjust
    });
  });

  describe('Custom configuration flow', () => {
    it('should collect full custom configuration', async () => {
      // Mock custom selection
      inquirer.prompt
        .mockResolvedValueOnce({ preset: 'custom' }) // Select custom
        .mockResolvedValueOnce({ platforms: ['mobile', 'web'] }) // Platforms selection
        .mockResolvedValueOnce({ orm: 'prisma' }) // ORM selection
        .mockResolvedValueOnce({
          // Feature selection (basic features)
          features: ['onboarding', 'authentication', 'paywall', 'sessionManagement'],
        })
        .mockResolvedValueOnce({
          // Auth details (OAuth providers and features) - new in BetterAuth
          providers: ['google'],
          authFeatures: ['passwordReset'],
        })
        .mockResolvedValueOnce({
          // SDK selection
          sdks: ['revenueCat', 'adjust'],
        })
        .mockResolvedValueOnce({
          // Onboarding config
          pages: 5,
          skipButton: true,
          showPaywall: true,
        })
        .mockResolvedValueOnce({ packageManager: 'yarn' }); // Package manager

      const options: CLIOptions = {};
      const config = await collectConfiguration('custom-app', options);

      expect(config.preset).toBe('custom');
      expect(config.customized).toBe(false);
      expect(config.features.onboarding.enabled).toBe(true);
      expect(config.features.onboarding.pages).toBe(5);
      expect(config.features.onboarding.skipButton).toBe(true);
      expect(config.features.onboarding.showPaywall).toBe(true);
      expect(config.features.authentication.enabled).toBe(true);
      expect(config.features.authentication.providers.google).toBe(true);
      expect(config.features.paywall).toBe(true);
      expect(config.integrations.revenueCat.enabled).toBe(true);
      expect(config.integrations.adjust.enabled).toBe(true);
      expect(config.integrations.scate.enabled).toBe(false);
      expect(config.integrations.att.enabled).toBe(true); // Auto-enabled with Adjust
      expect(config.backend.orm).toBe('prisma');
    });

    it('should skip onboarding config when onboarding not selected', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ preset: 'custom' })
        .mockResolvedValueOnce({ platforms: ['mobile', 'web'] }) // Platforms selection
        .mockResolvedValueOnce({ orm: 'drizzle' }) // ORM selection
        .mockResolvedValueOnce({
          features: ['authentication', 'sessionManagement'],
        })
        .mockResolvedValueOnce({
          // Auth details (OAuth providers and features) - new in BetterAuth
          providers: [],
          authFeatures: ['passwordReset'],
        })
        .mockResolvedValueOnce({ sdks: [] })
        .mockResolvedValueOnce({ packageManager: 'npm' });

      const options: CLIOptions = {};
      const config = await collectConfiguration('simple-app', options);

      expect(config.features.onboarding.enabled).toBe(false);
      expect(config.backend.orm).toBe('drizzle');
      // Should only call prompt 6 times (custom, orm, features, auth details, sdks, package manager)
      // Not calling onboarding config prompt (6 prompts + 1 for platforms = 7)
      expect(inquirer.prompt).toHaveBeenCalledTimes(7);
    });

    it('should auto-enable ATT when Adjust is selected', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ preset: 'custom' })
        .mockResolvedValueOnce({ platforms: ['mobile', 'web'] }) // Platforms selection
        .mockResolvedValueOnce({ orm: 'prisma' }) // ORM selection
        .mockResolvedValueOnce({ features: ['authentication'] })
        .mockResolvedValueOnce({
          // Auth details (OAuth providers and features) - new in BetterAuth
          providers: [],
          authFeatures: ['passwordReset'],
        })
        .mockResolvedValueOnce({ sdks: ['adjust', 'scate'] })
        .mockResolvedValueOnce({ packageManager: 'npm' });

      const options: CLIOptions = {};
      const config = await collectConfiguration('tracking-app', options);

      expect(config.integrations.adjust.enabled).toBe(true);
      expect(config.integrations.scate.enabled).toBe(true);
      expect(config.integrations.att.enabled).toBe(true); // Auto-enabled
    });
  });

  describe('Project name handling', () => {
    it('should use provided project name', async () => {
      const options: CLIOptions = { defaults: true };
      const config = await collectConfiguration('provided-name', options);

      expect(config.projectName).toBe('provided-name');
    });

    it('should prompt for project name if not provided', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ projectName: 'prompted-name' })
        .mockResolvedValueOnce({ packageManager: 'npm' });

      const options: CLIOptions = { template: 'minimal' };
      const config = await collectConfiguration(undefined, options);

      expect(config.projectName).toBe('prompted-name');
    });
  });

  describe('Backend configuration', () => {
    it('should always include backend with custom configuration', async () => {
      // When features is empty (no 'authentication'), promptFeatures doesn't call the auth details prompt
      inquirer.prompt
        .mockResolvedValueOnce({ preset: 'custom' })
        .mockResolvedValueOnce({ platforms: ['mobile', 'web'] }) // Platforms selection
        .mockResolvedValueOnce({ orm: 'prisma' }) // ORM selection
        .mockResolvedValueOnce({ features: [] })
        .mockResolvedValueOnce({ sdks: [] })
        .mockResolvedValueOnce({ packageManager: 'npm' });

      const options: CLIOptions = {};
      const config = await collectConfiguration('backend-app', options);

      expect(config.backend.database).toBe('postgresql');
      expect(config.backend.orm).toBe('prisma');
      expect(config.backend.eventQueue).toBe(true);
      expect(config.backend.docker).toBe(true);
    });

    it('should include drizzle when selected', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ preset: 'custom' })
        .mockResolvedValueOnce({ platforms: ['mobile', 'web'] }) // Platforms selection
        .mockResolvedValueOnce({ orm: 'drizzle' }) // ORM selection
        .mockResolvedValueOnce({ features: [] })
        .mockResolvedValueOnce({ sdks: [] })
        .mockResolvedValueOnce({ packageManager: 'npm' });

      const options: CLIOptions = {};
      const config = await collectConfiguration('drizzle-app', options);

      expect(config.backend.database).toBe('postgresql');
      expect(config.backend.orm).toBe('drizzle');
    });
  });
});
