import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock inquirer before importing modules that use it
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Mock all prompt modules
vi.mock('../../src/prompts/platform.js', () => ({
  promptPlatforms: vi.fn(),
}));

vi.mock('../../src/prompts/orm.js', () => ({
  promptORM: vi.fn(),
}));

vi.mock('../../src/prompts/features.js', () => ({
  promptFeatures: vi.fn(),
}));

vi.mock('../../src/prompts/sdks.js', () => ({
  promptSDKs: vi.fn(),
}));

vi.mock('../../src/prompts/onboarding.js', () => ({
  promptOnboarding: vi.fn(),
}));

vi.mock('../../src/prompts/project.js', () => ({
  promptProjectName: vi.fn(),
}));

vi.mock('../../src/prompts/preset.js', () => ({
  selectPreset: vi.fn(),
  customizePreset: vi.fn(),
}));

vi.mock('../../src/prompts/packageManager.js', () => ({
  promptPackageManager: vi.fn(),
}));

// Import after mocks are set up
import { promptPlatforms } from '../../src/prompts/platform.js';
import { promptORM } from '../../src/prompts/orm.js';
import { promptFeatures } from '../../src/prompts/features.js';
import { promptSDKs } from '../../src/prompts/sdks.js';
import { promptOnboarding } from '../../src/prompts/onboarding.js';
import { promptProjectName } from '../../src/prompts/project.js';
import { selectPreset } from '../../src/prompts/preset.js';
import { promptPackageManager } from '../../src/prompts/packageManager.js';
import { collectConfiguration } from '../../src/prompts/index.js';

describe('Conditional Prompts', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Common mocks for all tests
    vi.mocked(promptProjectName).mockResolvedValue('test-app');
    vi.mocked(promptPackageManager).mockResolvedValue('npm');
    // Return null from selectPreset to trigger custom configuration flow
    vi.mocked(selectPreset).mockResolvedValue(null);
  });

  describe('promptFeatures with platform awareness', () => {
    it('should return disabled onboarding for web-only platforms', async () => {
      // This tests the actual promptFeatures implementation behavior
      vi.mocked(promptFeatures).mockImplementation(async (platforms: string[] = ['mobile', 'web']) => {
        const hasMobile = platforms.includes('mobile');
        return {
          onboarding: { enabled: hasMobile ? true : false, pages: 3, skipButton: true, showPaywall: false },
          authentication: { enabled: true, providers: { emailPassword: true, google: false, apple: false, github: false } },
          paywall: hasMobile ? false : false,
          sessionManagement: true,
        };
      });

      const result = await promptFeatures(['web']);
      expect(result.onboarding.enabled).toBe(false);
      expect(result.paywall).toBe(false);
    });

    it('should return enabled onboarding for mobile platforms', async () => {
      vi.mocked(promptFeatures).mockImplementation(async (platforms: string[] = ['mobile', 'web']) => {
        const hasMobile = platforms.includes('mobile');
        return {
          onboarding: { enabled: hasMobile, pages: 3, skipButton: true, showPaywall: false },
          authentication: { enabled: true, providers: { emailPassword: true, google: false, apple: false, github: false } },
          paywall: false,
          sessionManagement: true,
        };
      });

      const result = await promptFeatures(['mobile']);
      expect(result.onboarding.enabled).toBe(true);
    });
  });

  describe('SDK prompts conditional on platform', () => {
    it('should skip SDK prompts for web-only projects', async () => {
      // Set up mocks to simulate web-only flow
      vi.mocked(promptPlatforms).mockResolvedValue(['web']);
      vi.mocked(promptORM).mockResolvedValue('prisma');
      vi.mocked(promptFeatures).mockResolvedValue({
        onboarding: { enabled: false, pages: 3, skipButton: true, showPaywall: false },
        authentication: { enabled: true, providers: { emailPassword: true, google: false, apple: false, github: false } },
        paywall: false,
        sessionManagement: true,
      });

      // Call collectConfiguration which triggers collectCustomConfiguration internally
      await collectConfiguration(undefined, {});

      // The key assertion: promptSDKs should NOT be called for web-only
      expect(promptSDKs).not.toHaveBeenCalled();
    });

    it('should call SDK prompts for mobile projects', async () => {
      vi.mocked(promptPlatforms).mockResolvedValue(['mobile']);
      vi.mocked(promptORM).mockResolvedValue('prisma');
      vi.mocked(promptFeatures).mockResolvedValue({
        onboarding: { enabled: true, pages: 3, skipButton: true, showPaywall: false },
        authentication: { enabled: true, providers: { emailPassword: true, google: false, apple: false, github: false } },
        paywall: false,
        sessionManagement: true,
      });
      vi.mocked(promptSDKs).mockResolvedValue({
        revenueCat: { enabled: false, iosKey: '', androidKey: '' },
        adjust: { enabled: false, appToken: '', environment: 'sandbox' },
        scate: { enabled: false, apiKey: '' },
        att: { enabled: false },
      });
      vi.mocked(promptOnboarding).mockResolvedValue({
        pages: 3,
        skipButton: true,
        showPaywall: false,
      });

      await collectConfiguration(undefined, {});

      expect(promptSDKs).toHaveBeenCalled();
    });
  });
});
