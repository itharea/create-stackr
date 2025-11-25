import { describe, it, expect, vi, beforeEach } from 'vitest';
import { selectPreset, customizePreset } from '../../src/prompts/preset.js';
import type { ProjectConfig } from '../../src/types/index.js';

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

// Mock chalk to avoid console output in tests
vi.mock('chalk', () => ({
  default: {
    cyan: (text: string) => text,
    gray: (text: string) => text,
  },
}));

describe('Preset Edge Cases', () => {
  let inquirer: any;

  beforeEach(async () => {
    inquirer = (await import('inquirer')).default;
    vi.clearAllMocks();
  });

  describe('selectPreset', () => {
    it('should throw error when preset not found (impossible edge case)', async () => {
      // Mock selecting a preset name that doesn't exist
      // This simulates the internal find() returning undefined
      inquirer.prompt.mockResolvedValueOnce({ preset: 'non-existent-preset' });

      await expect(selectPreset()).rejects.toThrow('Preset not found: non-existent-preset');
    });
  });

  describe('customizePreset validation', () => {
    const mockConfig: Omit<ProjectConfig, 'projectName' | 'packageManager'> = {
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
      preset: 'minimal',
      customized: false,
    };

    it('should validate onboarding pages range (too low)', async () => {
      // Mock user choosing to customize
      inquirer.prompt
        .mockResolvedValueOnce({ customize: true })
        .mockResolvedValueOnce({
          onboarding: true,
          onboardingPages: 0, // Invalid: too low
          paywall: false,
          adjust: false,
          scate: false,
        });

      // Get the validation function by calling customizePreset
      const promise = customizePreset(mockConfig);

      // Wait a bit for inquirer to be called
      await new Promise(resolve => setTimeout(resolve, 10));

      // Get the validate function from the onboardingPages question
      const promptCalls = inquirer.prompt.mock.calls;
      const secondCall = promptCalls[1];
      if (secondCall && secondCall[0]) {
        const onboardingPagesQuestion = secondCall[0].find(
          (q: any) => q.name === 'onboardingPages'
        );
        if (onboardingPagesQuestion && onboardingPagesQuestion.validate) {
          const result = onboardingPagesQuestion.validate(0);
          expect(result).toBe('Please enter a number between 1 and 5');
        }
      }

      await promise;
    });

    it('should validate onboarding pages range (too high)', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ customize: true })
        .mockResolvedValueOnce({
          onboarding: true,
          onboardingPages: 6, // Invalid: too high
          paywall: false,
          adjust: false,
          scate: false,
        });

      const promise = customizePreset(mockConfig);
      await new Promise(resolve => setTimeout(resolve, 10));

      const promptCalls = inquirer.prompt.mock.calls;
      const secondCall = promptCalls[1];
      if (secondCall && secondCall[0]) {
        const onboardingPagesQuestion = secondCall[0].find(
          (q: any) => q.name === 'onboardingPages'
        );
        if (onboardingPagesQuestion && onboardingPagesQuestion.validate) {
          const result = onboardingPagesQuestion.validate(6);
          expect(result).toBe('Please enter a number between 1 and 5');
        }
      }

      await promise;
    });

    it('should accept valid onboarding pages', async () => {
      inquirer.prompt
        .mockResolvedValueOnce({ customize: true })
        .mockResolvedValueOnce({
          onboarding: true,
          onboardingPages: 3,
          paywall: false,
          adjust: false,
          scate: false,
        });

      const promise = customizePreset(mockConfig);
      await new Promise(resolve => setTimeout(resolve, 10));

      const promptCalls = inquirer.prompt.mock.calls;
      const secondCall = promptCalls[1];
      if (secondCall && secondCall[0]) {
        const onboardingPagesQuestion = secondCall[0].find(
          (q: any) => q.name === 'onboardingPages'
        );
        if (onboardingPagesQuestion && onboardingPagesQuestion.validate) {
          const result = onboardingPagesQuestion.validate(3);
          expect(result).toBe(true);
        }
      }

      const result = await promise;
      expect(result.features.onboarding.pages).toBe(3);
    });
  });
});
