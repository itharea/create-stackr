import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { fullFeaturedConfig } from '../fixtures/configs/full-featured.js';

/**
 * Mirror of `project-generator-web.test.ts`: a service with
 * `mobile.enabled: true` and `web: null`. Asserts the mobile subtree
 * lands under `<svc>/mobile/`, the web subtree is absent, and mobile
 * integrations (RC/Adjust/Scate/ATT) respect the service's
 * integration toggles.
 */
describe('project generator — mobile subtree (mobile-only service)', () => {
  let tempDir: string;
  let projectDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-gen-mobile-'));
    const cfg = cloneInitConfig(fullFeaturedConfig);
    const core = cfg.services.find((s) => s.name === 'core')!;
    core.web = null; // mobile-only
    cfg.projectName = 'test-mobile-only';
    cfg.appScheme = 'testmobileonly';
    projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  it('creates core/mobile/ tree', async () => {
    expect(await fs.pathExists(path.join(projectDir, 'core/mobile'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'core/mobile/app'))).toBe(true);
  });

  it('does NOT create core/web/ tree', async () => {
    expect(await fs.pathExists(path.join(projectDir, 'core/web'))).toBe(false);
  });

  it('mobile package.json name is <projectName>-<service.name>-mobile and parses', async () => {
    const raw = await fs.readFile(path.join(projectDir, 'core/mobile/package.json'), 'utf-8');
    const pkg = JSON.parse(raw);
    expect(pkg.name).toBe('test-mobile-only-core-mobile');
  });

  it('mobile package.json includes conditional RevenueCat dep', async () => {
    const raw = await fs.readFile(path.join(projectDir, 'core/mobile/package.json'), 'utf-8');
    const pkg = JSON.parse(raw);
    const deps: Record<string, string> = pkg.dependencies ?? {};
    expect(deps['react-native-purchases']).toBeDefined();
  });

  it('mobile package.json includes conditional Adjust dep', async () => {
    const raw = await fs.readFile(path.join(projectDir, 'core/mobile/package.json'), 'utf-8');
    const pkg = JSON.parse(raw);
    const deps: Record<string, string> = pkg.dependencies ?? {};
    expect(deps['react-native-adjust']).toBeDefined();
  });

  it('backend still lands at core/backend/', async () => {
    expect(await fs.pathExists(path.join(projectDir, 'core/backend'))).toBe(true);
  });
});

describe('project generator — mobile service with all integrations disabled', () => {
  let tempDir: string;
  let projectDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-gen-mobile-disabled-'));
    const cfg = cloneInitConfig(fullFeaturedConfig);
    const core = cfg.services.find((s) => s.name === 'core')!;
    core.web = null;
    core.integrations.revenueCat.enabled = false;
    core.integrations.adjust.enabled = false;
    core.integrations.scate.enabled = false;
    core.integrations.att.enabled = false;
    cfg.projectName = 'test-mobile-no-sdk';
    cfg.appScheme = 'testmobilenosdk';
    projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  it('mobile package.json omits SDK deps when toggles are off', async () => {
    const raw = await fs.readFile(path.join(projectDir, 'core/mobile/package.json'), 'utf-8');
    const pkg = JSON.parse(raw);
    const deps: Record<string, string> = pkg.dependencies ?? {};
    expect(deps['react-native-purchases']).toBeUndefined();
    expect(deps['react-native-adjust']).toBeUndefined();
    expect(deps['scatesdk-react']).toBeUndefined();
    expect(deps['expo-tracking-transparency']).toBeUndefined();
  });
});
