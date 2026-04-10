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
      aiTools: ['codex'],
    };

    const generator = new ProjectGenerator(config);
    const projectDir = path.join(tempDir, 'test-minimal');
    await generator.generate(projectDir);

    // Verify basic structure exists (phase 1: nested under core/)
    expect(await fs.pathExists(path.join(projectDir, 'core/mobile'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'core/backend'))).toBe(true);

    // Verify package.json files exist
    expect(await fs.pathExists(path.join(projectDir, 'core/mobile/package.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'core/backend/package.json'))).toBe(true);

    // Verify stackr.config.json is written at the project root and parses
    const stackrConfigPath = path.join(projectDir, 'stackr.config.json');
    expect(await fs.pathExists(stackrConfigPath)).toBe(true);
    const stackrConfig = await fs.readJSON(stackrConfigPath);
    expect(stackrConfig.version).toBe(1);
    expect(stackrConfig.projectName).toBe('test-minimal');
    expect(stackrConfig.orm).toBe('prisma');
    expect(stackrConfig.services).toHaveLength(1);
    expect(stackrConfig.services[0].name).toBe('core');
    expect(stackrConfig.services[0].kind).toBe('base');

    // Verify package.json content
    const mobilePkg = await fs.readJSON(path.join(projectDir, 'core/mobile/package.json'));
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
      aiTools: ['codex'],
    };

    const generator = new ProjectGenerator(config);
    const projectDir = path.join(tempDir, 'test-onboarding');
    await generator.generate(projectDir);

    // Verify onboarding directory exists (phase 1: under core/mobile)
    const onboardingDir = path.join(projectDir, 'core/mobile/app/(onboarding)');
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
      aiTools: ['codex'],
    };

    const generator = new ProjectGenerator(config);
    const projectDir = path.join(tempDir, 'test-integrations');
    await generator.generate(projectDir);

    // Verify package.json includes integrations (phase 1: under core/)
    const mobilePkg = await fs.readJSON(path.join(projectDir, 'core/mobile/package.json'));
    expect(mobilePkg.dependencies['react-native-purchases']).toBeDefined();
    expect(mobilePkg.dependencies['react-native-adjust']).toBeDefined();
    expect(mobilePkg.dependencies['expo-tracking-transparency']).toBeDefined();

    // Verify integration service files exist
    expect(
      await fs.pathExists(path.join(projectDir, 'core/mobile/src/services/revenuecat-service.ts'))
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectDir, 'core/mobile/src/services/adjust-service.ts'))
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
      aiTools: ['codex'],
    };

    const projectDir = path.join(tempDir, 'test-exists');

    // Create directory first
    await fs.ensureDir(projectDir);

    const generator = new ProjectGenerator(config);

    // Should throw error
    await expect(generator.generate(projectDir)).rejects.toThrow('already exists');
  });

  describe('AI tool file generation', () => {
    const createBaseConfig = (aiTools: ProjectConfig['aiTools']): ProjectConfig => ({
      projectName: 'test-ai-tools',
      packageManager: 'npm',
      appScheme: 'testaitools',
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
      aiTools,
    });

    it('should generate AGENTS.md when codex is selected', async () => {
      const config = createBaseConfig(['codex']);
      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'test-ai-tools-codex');
      await generator.generate(projectDir);

      expect(await fs.pathExists(path.join(projectDir, 'AGENTS.md'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'CLAUDE.md'))).toBe(false);
      expect(await fs.pathExists(path.join(projectDir, '.cursorrules'))).toBe(false);

      const content = await fs.readFile(path.join(projectDir, 'AGENTS.md'), 'utf-8');
      expect(content).toContain('AGENTS.md');
      expect(content).not.toContain('<%');
    });

    it('should generate multiple guideline files when multiple tools selected', async () => {
      const config = createBaseConfig(['claude', 'cursor']);
      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'test-ai-tools-multi');
      await generator.generate(projectDir);

      expect(await fs.pathExists(path.join(projectDir, 'CLAUDE.md'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, '.cursorrules'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'AGENTS.md'))).toBe(false);

      // Each file should reference its own filename
      const claudeContent = await fs.readFile(path.join(projectDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeContent).toContain('CLAUDE.md');

      const cursorContent = await fs.readFile(path.join(projectDir, '.cursorrules'), 'utf-8');
      expect(cursorContent).toContain('.cursorrules');
    });

    it('should generate no guideline files when no tools selected', async () => {
      const config = createBaseConfig([]);
      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'test-ai-tools-none');
      await generator.generate(projectDir);

      expect(await fs.pathExists(path.join(projectDir, 'AGENTS.md'))).toBe(false);
      expect(await fs.pathExists(path.join(projectDir, 'CLAUDE.md'))).toBe(false);
      expect(await fs.pathExists(path.join(projectDir, '.cursorrules'))).toBe(false);
      expect(await fs.pathExists(path.join(projectDir, '.windsurfrules'))).toBe(false);
    });

    it('should generate all four guideline files when all tools selected', async () => {
      const config = createBaseConfig(['claude', 'codex', 'cursor', 'windsurf']);
      const generator = new ProjectGenerator(config);
      const projectDir = path.join(tempDir, 'test-ai-tools-all');
      await generator.generate(projectDir);

      expect(await fs.pathExists(path.join(projectDir, 'CLAUDE.md'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, 'AGENTS.md'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, '.cursorrules'))).toBe(true);
      expect(await fs.pathExists(path.join(projectDir, '.windsurfrules'))).toBe(true);
    });
  });
});
