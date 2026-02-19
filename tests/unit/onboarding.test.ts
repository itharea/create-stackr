import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { generateOnboardingPages } from '../../src/generators/onboarding.js';
import type { ProjectConfig } from '../../src/types/index.js';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('Onboarding Generator', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-onboarding-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('should not generate pages if onboarding is disabled', async () => {
    const config: ProjectConfig = {
      projectName: 'test-app',
      packageManager: 'npm',
      appScheme: 'testapp',
      platforms: ['mobile'],
      features: {
        onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
        authentication: {
          enabled: true,
          providers: { emailPassword: true, google: false, apple: false, github: false },
          emailVerification: false,
          passwordReset: true,
          twoFactor: false,
        },
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

    await generateOnboardingPages(config, tempDir);

    const onboardingDir = path.join(tempDir, 'mobile/app/(onboarding)');
    expect(await fs.pathExists(onboardingDir)).toBe(false);
  });

  it('should not generate pages for 1-3 pages (handled by templates)', async () => {
    const config: ProjectConfig = {
      projectName: 'test-app',
      packageManager: 'npm',
      appScheme: 'testapp',
      platforms: ['mobile'],
      features: {
        onboarding: { enabled: true, pages: 3, skipButton: true, showPaywall: false },
        authentication: {
          enabled: true,
          providers: { emailPassword: true, google: false, apple: false, github: false },
          emailVerification: false,
          passwordReset: true,
          twoFactor: false,
        },
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

    await generateOnboardingPages(config, tempDir);

    // Should not generate any files (templates handle 1-3)
    const onboardingDir = path.join(tempDir, 'mobile/app/(onboarding)');
    expect(await fs.pathExists(onboardingDir)).toBe(false);
  });

  it('should generate pages 4-5 when needed', async () => {
    const config: ProjectConfig = {
      projectName: 'test-app',
      packageManager: 'npm',
      appScheme: 'testapp',
      platforms: ['mobile'],
      features: {
        onboarding: { enabled: true, pages: 5, skipButton: true, showPaywall: false },
        authentication: {
          enabled: true,
          providers: { emailPassword: true, google: false, apple: false, github: false },
          emailVerification: false,
          passwordReset: true,
          twoFactor: false,
        },
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

    await generateOnboardingPages(config, tempDir);

    const onboardingDir = path.join(tempDir, 'mobile/app/(onboarding)');
    expect(await fs.pathExists(onboardingDir)).toBe(true);

    // Should have generated pages 4 and 5
    expect(await fs.pathExists(path.join(onboardingDir, 'page-4.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(onboardingDir, 'page-5.tsx'))).toBe(true);

    // Should have updated _layout.tsx
    expect(await fs.pathExists(path.join(onboardingDir, '_layout.tsx'))).toBe(true);

    // Verify layout includes all pages
    const layoutContent = await fs.readFile(path.join(onboardingDir, '_layout.tsx'), 'utf-8');
    expect(layoutContent).toContain('page-1');
    expect(layoutContent).toContain('page-2');
    expect(layoutContent).toContain('page-3');
    expect(layoutContent).toContain('page-4');
    expect(layoutContent).toContain('page-5');
  });

  it('should include skip button when enabled', async () => {
    const config: ProjectConfig = {
      projectName: 'test-app',
      packageManager: 'npm',
      appScheme: 'testapp',
      platforms: ['mobile'],
      features: {
        onboarding: { enabled: true, pages: 4, skipButton: true, showPaywall: false },
        authentication: {
          enabled: true,
          providers: { emailPassword: true, google: false, apple: false, github: false },
          emailVerification: false,
          passwordReset: true,
          twoFactor: false,
        },
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

    await generateOnboardingPages(config, tempDir);

    const pageContent = await fs.readFile(
      path.join(tempDir, 'mobile/app/(onboarding)/page-4.tsx'),
      'utf-8'
    );

    expect(pageContent).toContain('handleSkip');
    expect(pageContent).toContain('onSkip');
  });

  it('should navigate to paywall on last page when enabled', async () => {
    const config: ProjectConfig = {
      projectName: 'test-app',
      packageManager: 'npm',
      appScheme: 'testapp',
      platforms: ['mobile'],
      features: {
        onboarding: { enabled: true, pages: 4, skipButton: false, showPaywall: true },
        authentication: {
          enabled: true,
          providers: { emailPassword: true, google: false, apple: false, github: false },
          emailVerification: false,
          passwordReset: true,
          twoFactor: false,
        },
        paywall: true,
        sessionManagement: true,
      },
      integrations: {
        revenueCat: { enabled: true, iosKey: 'test-key', androidKey: 'test-key' },
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

    await generateOnboardingPages(config, tempDir);

    const lastPageContent = await fs.readFile(
      path.join(tempDir, 'mobile/app/(onboarding)/page-4.tsx'),
      'utf-8'
    );

    expect(lastPageContent).toContain("router.replace('/paywall')");
  });

  it('should navigate to tabs on last page when paywall disabled', async () => {
    const config: ProjectConfig = {
      projectName: 'test-app',
      packageManager: 'npm',
      appScheme: 'testapp',
      platforms: ['mobile'],
      features: {
        onboarding: { enabled: true, pages: 4, skipButton: false, showPaywall: false },
        authentication: {
          enabled: true,
          providers: { emailPassword: true, google: false, apple: false, github: false },
          emailVerification: false,
          passwordReset: true,
          twoFactor: false,
        },
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

    await generateOnboardingPages(config, tempDir);

    const lastPageContent = await fs.readFile(
      path.join(tempDir, 'mobile/app/(onboarding)/page-4.tsx'),
      'utf-8'
    );

    expect(lastPageContent).toContain("router.replace('/(tabs)')");
  });
});
