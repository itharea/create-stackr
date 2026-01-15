import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProjectGenerator } from '../../src/generators/index.js';
import { PRESETS } from '../../src/config/presets.js';
import { validateConfiguration } from '../../src/utils/validation.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Mock execa to avoid actual git operations
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));

// Mock inquirer to skip cleanup prompt
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ shouldCleanup: false }),
  },
}));

describe('Preset Customization Flows', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'preset-custom-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should validate all preset configurations', () => {
    for (const preset of PRESETS) {
      const config = {
        ...preset.config,
        projectName: 'test-preset',
        packageManager: 'npm' as const,
        appScheme: 'testpreset',
      };

      const result = validateConfiguration(config);
      expect(result.valid).toBe(true);
    }
  });

  it('should generate valid project from minimal preset', async () => {
    const minimalPreset = PRESETS.find(p => p.name === 'Minimal');
    expect(minimalPreset).toBeDefined();

    const config = {
      ...minimalPreset!.config,
      projectName: 'minimal-preset-test',
      packageManager: 'npm' as const,
      appScheme: 'minimalpresettest',
    };

    const generator = new ProjectGenerator(config);
    const projectDir = path.join(tempDir, 'minimal-preset-test');
    await generator.generate(projectDir);

    // Verify structure based on preset config
    if (config.platforms.includes('mobile')) {
      expect(await fs.pathExists(path.join(projectDir, 'mobile/package.json'))).toBe(true);
    }
    if (config.platforms.includes('web')) {
      expect(await fs.pathExists(path.join(projectDir, 'web/package.json'))).toBe(true);
    }
    expect(await fs.pathExists(path.join(projectDir, 'backend/package.json'))).toBe(true);
  });

  it('should generate valid project from full-featured preset', async () => {
    const fullPreset = PRESETS.find(p => p.name === 'Full-Featured');
    expect(fullPreset).toBeDefined();

    const config = {
      ...fullPreset!.config,
      projectName: 'full-preset-test',
      packageManager: 'npm' as const,
      appScheme: 'fullpresettest',
    };

    const generator = new ProjectGenerator(config);
    const projectDir = path.join(tempDir, 'full-preset-test');
    await generator.generate(projectDir);

    // Verify integrations are included
    const mobilePkg = await fs.readJSON(path.join(projectDir, 'mobile/package.json'));

    if (config.integrations.revenueCat.enabled) {
      expect(mobilePkg.dependencies['react-native-purchases']).toBeDefined();
    }
    if (config.integrations.adjust.enabled) {
      expect(mobilePkg.dependencies['react-native-adjust']).toBeDefined();
    }
  });
});
