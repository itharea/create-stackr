import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ProjectGenerator } from '../../src/generators/index.js';
import { PRESETS } from '../../src/config/presets.js';

// Mock execa to avoid actual git operations
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));

// Mock inquirer
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ shouldCleanup: false }),
  },
}));

describe('E2E: Preset Generation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'preset-e2e-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  // Generate a test for each preset
  for (const preset of PRESETS) {
    const presetSlug = preset.name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    it(`should generate valid project for "${preset.name}" preset`, async () => {
      const config = {
        ...preset.config,
        projectName: `${presetSlug}-test`,
        packageManager: 'npm' as const,
        appScheme: `${presetSlug}test`.replace(/-/g, ''),
      };

      const projectDir = path.join(tempDir, config.projectName);
      const generator = new ProjectGenerator(config);
      await generator.generate(projectDir);

      // Verify platform directories (phase 1: nested under core/)
      if (config.platforms.includes('mobile')) {
        expect(await fs.pathExists(path.join(projectDir, 'core/mobile'))).toBe(true);
        expect(await fs.pathExists(path.join(projectDir, 'core/mobile/package.json'))).toBe(true);
        expect(await fs.pathExists(path.join(projectDir, 'core/mobile/app.json'))).toBe(true);

        // Verify package.json is valid JSON
        const mobilePkg = await fs.readJSON(path.join(projectDir, 'core/mobile/package.json'));
        expect(mobilePkg.name).toBe(`${config.projectName}-mobile`);
      }

      if (config.platforms.includes('web')) {
        expect(await fs.pathExists(path.join(projectDir, 'core/web'))).toBe(true);
        expect(await fs.pathExists(path.join(projectDir, 'core/web/package.json'))).toBe(true);

        const webPkg = await fs.readJSON(path.join(projectDir, 'core/web/package.json'));
        expect(webPkg.name).toBe(`${config.projectName}-web`);
      }

      // Backend always exists
      expect(await fs.pathExists(path.join(projectDir, 'core/backend'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'core/backend/package.json'))).toBe(true);

      const backendPkg = await fs.readJSON(path.join(projectDir, 'core/backend/package.json'));
      expect(backendPkg.name).toBe(`${config.projectName}-backend`);

      // Verify stackr.config.json is written at the project root
      const stackrConfigPath = path.join(projectDir, 'stackr.config.json');
      expect(await fs.pathExists(stackrConfigPath)).toBe(true);
      const stackrConfig = await fs.readJSON(stackrConfigPath);
      expect(stackrConfig.version).toBe(1);
      expect(stackrConfig.services[0].name).toBe('core');

      // Verify no unprocessed EJS in TypeScript files
      const tsFiles = await findTypeScriptFiles(projectDir);
      for (const file of tsFiles.slice(0, 10)) { // Check first 10 files
        const content = await fs.readFile(file, 'utf-8');
        expect(content).not.toContain('<%');
        expect(content).not.toContain('%>');
      }
    });
  }
});

async function findTypeScriptFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...await findTypeScriptFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      files.push(fullPath);
    }
  }

  return files;
}
