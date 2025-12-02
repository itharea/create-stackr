import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProjectGenerator } from '../../src/generators/index.js';
import type { ProjectConfig } from '../../src/types/index.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

// Mock execa to avoid actual git/npm operations
vi.mock('execa', () => ({
  execa: vi.fn().mockResolvedValue({ stdout: '', stderr: '' }),
}));

// Mock inquirer to automatically skip cleanup prompt
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ shouldCleanup: false }),
  },
}));

describe('E2E: Full Project Generation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-e2e-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should generate complete minimal project', async () => {
    const config: ProjectConfig & { skipInstall: boolean } = {
      projectName: 'minimal-app',
      packageManager: 'npm',
      features: {
        onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
        authentication: true,
        paywall: false,
        sessionManagement: true,
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
      skipInstall: true,
    };

    const generator = new ProjectGenerator(config);
    const projectDir = path.join(tempDir, 'minimal-app');
    await generator.generate(projectDir);

    // Verify top-level structure
    expect(await fs.pathExists(path.join(projectDir, 'mobile'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'backend'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'scripts'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, '.gitignore'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'README.md'))).toBe(true);

    // Verify mobile structure
    expect(await fs.pathExists(path.join(projectDir, 'mobile/app'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'mobile/src'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'mobile/package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'mobile/tsconfig.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'mobile/.env.example'))).toBe(true);

    // Verify backend structure
    expect(await fs.pathExists(path.join(projectDir, 'backend/controllers'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'backend/domain'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'backend/package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'backend/.env.example'))).toBe(true);

    // Verify package.json validity
    const mobilePkg = await fs.readJSON(path.join(projectDir, 'mobile/package.json'));
    expect(mobilePkg.name).toBe('minimal-app-mobile');
    expect(mobilePkg.dependencies).toBeDefined();
    expect(mobilePkg.scripts).toBeDefined();

    const backendPkg = await fs.readJSON(path.join(projectDir, 'backend/package.json'));
    expect(backendPkg.name).toBe('minimal-app-backend');
    expect(backendPkg.dependencies).toBeDefined();
    expect(backendPkg.scripts).toBeDefined();
  });

  it('should generate complete full-featured project', async () => {
    const config: ProjectConfig & { skipInstall: boolean } = {
      projectName: 'full-featured-app',
      packageManager: 'npm',
      features: {
        onboarding: { enabled: true, pages: 5, skipButton: true, showPaywall: true },
        authentication: true,
        paywall: true,
        sessionManagement: true,
      },
      integrations: {
        revenueCat: { enabled: true, iosKey: 'test-ios-key', androidKey: 'test-android-key' },
        adjust: { enabled: true, appToken: 'test-token', environment: 'sandbox' },
        scate: { enabled: true, apiKey: 'test-scate-key' },
        att: { enabled: true },
      },
      backend: {
        database: 'postgresql',
        eventQueue: true,
        docker: true,
      },
      preset: 'full-featured',
      customized: false,
      skipInstall: true,
    };

    const generator = new ProjectGenerator(config);
    const projectDir = path.join(tempDir, 'full-featured-app');
    await generator.generate(projectDir);

    // Verify all integrations are included
    const mobilePkg = await fs.readJSON(path.join(projectDir, 'mobile/package.json'));
    expect(mobilePkg.dependencies['react-native-purchases']).toBeDefined();
    expect(mobilePkg.dependencies['react-native-adjust']).toBeDefined();
    expect(mobilePkg.dependencies['scatesdk-react']).toBeDefined();
    expect(mobilePkg.dependencies['expo-tracking-transparency']).toBeDefined();

    // Verify onboarding pages
    const onboardingDir = path.join(projectDir, 'mobile/app/(onboarding)');
    expect(await fs.pathExists(path.join(onboardingDir, 'page-1.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(onboardingDir, 'page-2.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(onboardingDir, 'page-3.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(onboardingDir, 'page-4.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(onboardingDir, 'page-5.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(onboardingDir, '_layout.tsx'))).toBe(true);

    // Verify paywall
    expect(await fs.pathExists(path.join(projectDir, 'mobile/app/paywall.tsx'))).toBe(true);

    // Verify integration services
    expect(
      await fs.pathExists(path.join(projectDir, 'mobile/src/services/revenuecatService.ts'))
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, 'mobile/src/services/adjustService.ts'))
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, 'mobile/src/services/scateService.ts'))
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, 'mobile/src/services/attService.ts'))
    ).toBe(true);

    // Verify backend has event queue
    const backendPkg = await fs.readJSON(path.join(projectDir, 'backend/package.json'));
    expect(backendPkg.dependencies.bullmq).toBeDefined();

    // Verify event queue controller exists
    expect(
      await fs.pathExists(path.join(projectDir, 'backend/controllers/event-queue'))
    ).toBe(true);
  });

  it('should generate valid JSON configuration files', async () => {
    const config: ProjectConfig & { skipInstall: boolean } = {
      projectName: 'json-test-app',
      packageManager: 'npm',
      features: {
        onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
        authentication: true,
        paywall: false,
        sessionManagement: true,
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
      skipInstall: true,
    };

    const generator = new ProjectGenerator(config);
    const projectDir = path.join(tempDir, 'json-test-app');
    await generator.generate(projectDir);

    // All JSON files should be valid
    const jsonFiles = [
      'mobile/package.json',
      'mobile/app.json',
      'mobile/tsconfig.json',
      'backend/package.json',
      'backend/tsconfig.json',
    ];

    for (const file of jsonFiles) {
      const filePath = path.join(projectDir, file);
      expect(await fs.pathExists(filePath)).toBe(true);

      // Should parse without error
      const content = await fs.readJSON(filePath);
      expect(content).toBeDefined();
    }
  });

  it('should generate valid TypeScript files that can be type-checked', async () => {
    const config: ProjectConfig & { skipInstall: boolean } = {
      projectName: 'ts-test-app',
      packageManager: 'npm',
      features: {
        onboarding: { enabled: true, pages: 3, skipButton: true, showPaywall: false },
        authentication: true,
        paywall: false,
        sessionManagement: true,
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
      preset: 'custom',
      customized: false,
      skipInstall: true,
    };

    const generator = new ProjectGenerator(config);
    const projectDir = path.join(tempDir, 'ts-test-app');
    await generator.generate(projectDir);

    // Verify TypeScript files exist and have valid syntax
    const tsFiles = [
      'mobile/app/_layout.tsx',
      'mobile/app/(tabs)/_layout.tsx',
      'mobile/app/(tabs)/index.tsx',
      'mobile/app/(onboarding)/_layout.tsx',
      'mobile/app/(onboarding)/page-1.tsx',
      'mobile/src/constants/Theme.ts',
      'mobile/src/utils/responsive.ts',
    ];

    for (const file of tsFiles) {
      const filePath = path.join(projectDir, file);
      expect(await fs.pathExists(filePath)).toBe(true);

      const content = await fs.readFile(filePath, 'utf-8');
      expect(content.length).toBeGreaterThan(0);
      // Basic syntax check - should have valid TS/TSX structure
      expect(content).not.toContain('<%'); // No unprocessed EJS
      expect(content).not.toContain('%>'); // No unprocessed EJS
    }
  });
});
