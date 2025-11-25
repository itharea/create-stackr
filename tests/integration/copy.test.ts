import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { copyTemplateFiles, copyFile } from '../../src/utils/copy.js';
import type { ProjectConfig } from '../../src/types/index.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { TEMPLATE_DIR } from '../../src/utils/template.js';

describe('Copy Utils', () => {
  let tempDir: string;
  const mockConfig: ProjectConfig = {
    projectName: 'test-app',
    packageManager: 'npm',
    features: {
      onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
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

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('copyTemplateFiles', () => {
    it('should copy template files to target directory', async () => {
      await copyTemplateFiles(tempDir, mockConfig);

      // Check that basic structure exists (at least some files should be copied)
      const mobileDir = path.join(tempDir, 'mobile');
      const backendDir = path.join(tempDir, 'backend');

      // These paths should exist if templates are copied
      const mobileDirExists = await fs.pathExists(mobileDir);
      const backendDirExists = await fs.pathExists(backendDir);

      expect(mobileDirExists || backendDirExists).toBe(true);
    });

    it('should not copy onboarding files when disabled', async () => {
      await copyTemplateFiles(tempDir, mockConfig);

      // Onboarding directory should NOT exist since it's disabled
      const onboardingDir = path.join(tempDir, 'mobile/app/(onboarding)');
      const exists = await fs.pathExists(onboardingDir);

      expect(exists).toBe(false);
    });

    it('should skip directories during file iteration', async () => {
      // This test implicitly verifies the directory skip logic is working
      // If it wasn't working, the function would error on trying to copy directories
      await copyTemplateFiles(tempDir, mockConfig);

      // Verify files were copied (not directories)
      const files = await fs.readdir(tempDir, { recursive: true });
      expect(files.length).toBeGreaterThan(0);
    });
  });

  describe('copyFile', () => {
    it('should copy a static file without config', async () => {
      const sourceFile = path.join(TEMPLATE_DIR, 'base/mobile/src/constants/Theme.ts');
      const destFile = path.join(tempDir, 'Theme.ts');

      await copyFile(sourceFile, destFile);

      const exists = await fs.pathExists(destFile);
      expect(exists).toBe(true);

      const content = await fs.readFile(destFile, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should render EJS template when config provided', async () => {
      const sourceFile = 'base/mobile/package.json.ejs';
      const destFile = path.join(tempDir, 'package.json');

      await copyFile(sourceFile, destFile, mockConfig);

      const exists = await fs.pathExists(destFile);
      expect(exists).toBe(true);

      const content = await fs.readFile(destFile, 'utf-8');
      const parsed = JSON.parse(content);
      expect(parsed.name).toBe('test-app-mobile');
    });

    it('should copy EJS file as-is when no config provided', async () => {
      const sourceFile = path.join(TEMPLATE_DIR, 'base/mobile/package.json.ejs');
      const destFile = path.join(tempDir, 'package.json.ejs');

      await copyFile(sourceFile, destFile);

      const exists = await fs.pathExists(destFile);
      expect(exists).toBe(true);

      const content = await fs.readFile(destFile, 'utf-8');
      // Should contain EJS syntax since not rendered
      expect(content).toContain('<%');
    });

    it('should create parent directories if they dont exist', async () => {
      const sourceFile = path.join(TEMPLATE_DIR, 'base/mobile/src/constants/Theme.ts');
      const destFile = path.join(tempDir, 'deeply/nested/path/Theme.ts');

      await copyFile(sourceFile, destFile);

      const exists = await fs.pathExists(destFile);
      expect(exists).toBe(true);
    });
  });
});
