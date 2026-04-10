import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { generateOnboardingPages } from '../../src/generators/onboarding.js';
import { buildServiceContext } from '../../src/generators/service-context.js';
import { fullFeaturedConfig } from '../fixtures/configs/full-featured.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';

describe('generateOnboardingPages', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'onboarding-test-'));
  });

  afterEach(async () => {
    await fs.remove(tmpDir);
  });

  it('no-ops when service has no mobile platform', async () => {
    const cloned = cloneInitConfig(fullFeaturedConfig);
    const core = cloned.services.find((s) => s.name === 'core')!;
    core.mobile = null;

    const ctx = buildServiceContext(cloned, core);
    // Shim always returns onboarding disabled today — regardless, nothing
    // should be written for a non-mobile service.
    const serviceRoot = path.join(tmpDir, 'core');
    await generateOnboardingPages(ctx, serviceRoot);

    const onboardingDir = path.join(serviceRoot, 'mobile/app/(onboarding)');
    expect(await fs.pathExists(onboardingDir)).toBe(false);
  });

  it('no-ops when features.onboarding.enabled is false', async () => {
    const cloned = cloneInitConfig(fullFeaturedConfig);
    const core = cloned.services.find((s) => s.name === 'core')!;

    const ctx = buildServiceContext(cloned, core);
    // Shim currently always disables onboarding; verify this is a no-op.
    expect(ctx.features.onboarding.enabled).toBe(false);

    const serviceRoot = path.join(tmpDir, 'core');
    await generateOnboardingPages(ctx, serviceRoot);

    const onboardingDir = path.join(serviceRoot, 'mobile/app/(onboarding)');
    expect(await fs.pathExists(onboardingDir)).toBe(false);
  });

  it('no-ops when pages <= 3', async () => {
    const cloned = cloneInitConfig(fullFeaturedConfig);
    const core = cloned.services.find((s) => s.name === 'core')!;

    const ctx = buildServiceContext(cloned, core);
    // Manually enable onboarding on the shim for this test (the shim is a
    // derivation, but the function only reads from ctx.features).
    ctx.features.onboarding = {
      enabled: true,
      pages: 3,
      skipButton: false,
      showPaywall: false,
    };

    const serviceRoot = path.join(tmpDir, 'core');
    await generateOnboardingPages(ctx, serviceRoot);

    const page4 = path.join(serviceRoot, 'mobile/app/(onboarding)/page-4.tsx');
    expect(await fs.pathExists(page4)).toBe(false);
  });

  it('writes page-4 and page-5 under <serviceRoot>/mobile/app/(onboarding)/ when pages = 5', async () => {
    const cloned = cloneInitConfig(fullFeaturedConfig);
    const core = cloned.services.find((s) => s.name === 'core')!;

    const ctx = buildServiceContext(cloned, core);
    ctx.features.onboarding = {
      enabled: true,
      pages: 5,
      skipButton: true,
      showPaywall: false,
    };

    const serviceRoot = path.join(tmpDir, 'core');
    await generateOnboardingPages(ctx, serviceRoot);

    const onboardingDir = path.join(serviceRoot, 'mobile/app/(onboarding)');
    const page4 = path.join(onboardingDir, 'page-4.tsx');
    const page5 = path.join(onboardingDir, 'page-5.tsx');
    expect(await fs.pathExists(page4)).toBe(true);
    expect(await fs.pathExists(page5)).toBe(true);

    const page4Contents = await fs.readFile(page4, 'utf-8');
    expect(page4Contents).toContain('OnboardingPage4');
    expect(page4Contents).toContain('/(onboarding)/page-5');

    const page5Contents = await fs.readFile(page5, 'utf-8');
    expect(page5Contents).toContain('OnboardingPage5');
    // Last page navigates into the tabs root (no paywall in this fixture).
    expect(page5Contents).toContain('/(tabs)');
  });

  it('updates _layout.tsx to include every page', async () => {
    const cloned = cloneInitConfig(fullFeaturedConfig);
    const core = cloned.services.find((s) => s.name === 'core')!;

    const ctx = buildServiceContext(cloned, core);
    ctx.features.onboarding = {
      enabled: true,
      pages: 5,
      skipButton: false,
      showPaywall: false,
    };

    const serviceRoot = path.join(tmpDir, 'core');
    await generateOnboardingPages(ctx, serviceRoot);

    const layoutPath = path.join(serviceRoot, 'mobile/app/(onboarding)/_layout.tsx');
    expect(await fs.pathExists(layoutPath)).toBe(true);

    const layout = await fs.readFile(layoutPath, 'utf-8');
    expect(layout).toContain('page-1');
    expect(layout).toContain('page-2');
    expect(layout).toContain('page-3');
    expect(layout).toContain('page-4');
    expect(layout).toContain('page-5');
  });

  it('routes last page to paywall when showPaywall is true', async () => {
    const cloned = cloneInitConfig(fullFeaturedConfig);
    const core = cloned.services.find((s) => s.name === 'core')!;

    const ctx = buildServiceContext(cloned, core);
    ctx.features.onboarding = {
      enabled: true,
      pages: 4,
      skipButton: false,
      showPaywall: true,
    };

    const serviceRoot = path.join(tmpDir, 'core');
    await generateOnboardingPages(ctx, serviceRoot);

    const page4 = path.join(serviceRoot, 'mobile/app/(onboarding)/page-4.tsx');
    const contents = await fs.readFile(page4, 'utf-8');
    expect(contents).toContain('/paywall');
  });
});
