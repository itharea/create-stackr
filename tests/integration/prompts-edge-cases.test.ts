import { describe, it, expect, vi, beforeEach } from 'vitest';
import { promptProjectName } from '../../src/prompts/project.js';
import { promptOnboarding } from '../../src/prompts/onboarding.js';

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}));

describe('Prompt Edge Cases', () => {
  let inquirer: any;

  beforeEach(async () => {
    inquirer = (await import('inquirer')).default;
    vi.clearAllMocks();
  });

  describe('promptProjectName', () => {
    it('should return provided name without prompting', async () => {
      const name = await promptProjectName('already-provided');
      expect(name).toBe('already-provided');
      expect(inquirer.prompt).not.toHaveBeenCalled();
    });

    it('should prompt and return name when not provided', async () => {
      inquirer.prompt.mockResolvedValueOnce({ projectName: 'user-entered-name' });

      const name = await promptProjectName(undefined);
      expect(name).toBe('user-entered-name');
      expect(inquirer.prompt).toHaveBeenCalledTimes(1);
    });

    it('should validate project name format', async () => {
      inquirer.prompt.mockResolvedValueOnce({ projectName: 'valid-name' });

      const name = await promptProjectName(undefined);
      expect(name).toBe('valid-name');

      // Get the validation function from the prompt call
      const promptCall = inquirer.prompt.mock.calls[0][0];
      const validateFn = promptCall[0].validate;

      // Test validation function
      expect(validateFn('')).toBe('Project name cannot be empty');
      expect(validateFn('   ')).toBe('Project name cannot be empty');
      expect(validateFn('Invalid Name')).toBe(
        'Project name must contain only lowercase letters, numbers, and hyphens'
      );
      expect(validateFn('valid-name')).toBe(true);
    });
  });

  describe('promptOnboarding', () => {
    it('should prompt for onboarding config with RevenueCat', async () => {
      inquirer.prompt.mockResolvedValueOnce({
        pages: 3,
        skipButton: true,
        showPaywall: true,
      });

      const config = await promptOnboarding(true);

      expect(config.pages).toBe(3);
      expect(config.skipButton).toBe(true);
      expect(config.showPaywall).toBe(true);
    });

    it('should not ask about paywall when RevenueCat is not enabled', async () => {
      inquirer.prompt.mockResolvedValueOnce({
        pages: 2,
        skipButton: false,
      });

      const config = await promptOnboarding(false);

      expect(config.pages).toBe(2);
      expect(config.skipButton).toBe(false);
      expect(config.showPaywall).toBe(false);
    });

    it('should validate onboarding pages range', async () => {
      inquirer.prompt.mockResolvedValueOnce({
        pages: 4,
        skipButton: true,
        showPaywall: false,
      });

      await promptOnboarding(true);

      // Get the validation function from the prompt call
      const promptCall = inquirer.prompt.mock.calls[0][0];
      const pagesPrompt = promptCall.find((p: any) => p.name === 'pages');
      const validateFn = pagesPrompt.validate;

      // Test validation function
      expect(validateFn(0)).toBe('Please enter a number between 1 and 5');
      expect(validateFn(6)).toBe('Please enter a number between 1 and 5');
      expect(validateFn(1)).toBe(true);
      expect(validateFn(3)).toBe(true);
      expect(validateFn(5)).toBe(true);
    });

    it('should only show paywall option when hasRevenueCat is true', async () => {
      inquirer.prompt.mockResolvedValueOnce({
        pages: 3,
        skipButton: false,
      });

      await promptOnboarding(false);

      const promptCall = inquirer.prompt.mock.calls[0][0];
      const paywallPrompt = promptCall.find((p: any) => p.name === 'showPaywall');

      // Check the when function
      if (paywallPrompt && paywallPrompt.when) {
        const whenResult = paywallPrompt.when();
        expect(whenResult).toBe(false);
      }
    });
  });
});
