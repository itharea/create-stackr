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

// Mock inquirer to automatically confirm cleanup
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn().mockResolvedValue({ shouldCleanup: false }),
  },
}));

// Helper for auth configuration
const createAuthConfig = (enabled: boolean) => ({
  enabled,
  providers: {
    emailPassword: true,
    google: false,
    apple: false,
    github: false,
  },
  emailVerification: false,
  passwordReset: true,
  twoFactor: false,
});

describe('ProjectGenerator', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-gen-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should generate minimal project structure', async () => {
    const config: ProjectConfig = {
      projectName: 'test-minimal',
      packageManager: 'npm',
      appScheme: 'testminimal',
      platforms: ['mobile', 'web'],
      features: {
        onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
        authentication: createAuthConfig(true),
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
        orm: 'prisma',
        eventQueue: false,
        docker: true,
      },
      preset: 'minimal',
      customized: false,
    };

    const generator = new ProjectGenerator(config);
    const projectDir = path.join(tempDir, 'test-minimal');
    await generator.generate(projectDir);

    // Verify basic structure exists
    expect(await fs.pathExists(path.join(projectDir, 'mobile'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'backend'))).toBe(true);

    // Verify package.json files exist
    expect(await fs.pathExists(path.join(projectDir, 'mobile/package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'backend/package.json'))).toBe(true);

    // Verify package.json content
    const mobilePkg = await fs.readJSON(path.join(projectDir, 'mobile/package.json'));
    expect(mobilePkg.name).toBe('test-minimal-mobile');
    expect(mobilePkg.dependencies.expo).toBeDefined();

    // Verify RevenueCat is NOT included (minimal preset)
    expect(mobilePkg.dependencies['react-native-purchases']).toBeUndefined();
  });

  it('should generate project with onboarding pages', async () => {
    const config: ProjectConfig = {
      projectName: 'test-onboarding',
      packageManager: 'npm',
      appScheme: 'testonboarding',
      platforms: ['mobile', 'web'],
      features: {
        onboarding: { enabled: true, pages: 3, skipButton: true, showPaywall: false },
        authentication: createAuthConfig(true),
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
        orm: 'prisma',
        eventQueue: false,
        docker: true,
      },
      preset: 'custom',
      customized: false,
    };

    const generator = new ProjectGenerator(config);
    const projectDir = path.join(tempDir, 'test-onboarding');
    await generator.generate(projectDir);

    // Verify onboarding directory exists
    const onboardingDir = path.join(projectDir, 'mobile/app/(onboarding)');
    expect(await fs.pathExists(onboardingDir)).toBe(true);

    // Verify onboarding pages exist
    expect(await fs.pathExists(path.join(onboardingDir, 'page-1.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(onboardingDir, 'page-2.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(onboardingDir, 'page-3.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(onboardingDir, '_layout.tsx'))).toBe(true);
  });

  it('should include integrations when enabled', async () => {
    const config: ProjectConfig = {
      projectName: 'test-integrations',
      packageManager: 'npm',
      appScheme: 'testintegrations',
      platforms: ['mobile', 'web'],
      features: {
        onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
        authentication: createAuthConfig(true),
        paywall: true,
        sessionManagement: true,
      },
      integrations: {
        revenueCat: { enabled: true, iosKey: 'test-ios-key', androidKey: 'test-android-key' },
        adjust: { enabled: true, appToken: 'test-token', environment: 'sandbox' },
        scate: { enabled: false, apiKey: '' },
        att: { enabled: true },
      },
      backend: {
        database: 'postgresql',
        orm: 'prisma',
        eventQueue: false,
        docker: true,
      },
      preset: 'full-featured',
      customized: false,
    };

    const generator = new ProjectGenerator(config);
    const projectDir = path.join(tempDir, 'test-integrations');
    await generator.generate(projectDir);

    // Verify package.json includes integrations
    const mobilePkg = await fs.readJSON(path.join(projectDir, 'mobile/package.json'));
    expect(mobilePkg.dependencies['react-native-purchases']).toBeDefined();
    expect(mobilePkg.dependencies['react-native-adjust']).toBeDefined();
    expect(mobilePkg.dependencies['expo-tracking-transparency']).toBeDefined();

    // Verify integration service files exist
    expect(
      await fs.pathExists(path.join(projectDir, 'mobile/src/services/revenuecat-service.ts'))
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, 'mobile/src/services/adjust-service.ts'))
    ).toBe(true);
  });

  it('should throw error if directory already exists', async () => {
    const config: ProjectConfig = {
      projectName: 'test-exists',
      packageManager: 'npm',
      appScheme: 'testexists',
      platforms: ['mobile', 'web'],
      features: {
        onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
        authentication: createAuthConfig(true),
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
        orm: 'prisma',
        eventQueue: false,
        docker: true,
      },
      preset: 'minimal',
      customized: false,
    };

    const projectDir = path.join(tempDir, 'test-exists');

    // Create directory first
    await fs.ensureDir(projectDir);

    const generator = new ProjectGenerator(config);

    // Should throw error
    await expect(generator.generate(projectDir)).rejects.toThrow('already exists');
  });
});
