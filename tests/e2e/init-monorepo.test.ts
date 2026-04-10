import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import YAML from 'yaml';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { coreEntry } from '../../src/config/presets.js';

describe('E2E: monorepo generation', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'e2e-monorepo-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  it('generates a minimal monorepo with auth + core', async () => {
    const projectDir = path.join(tempDir, 'minimal-e2e');
    const generator = new MonorepoGenerator(minimalConfig);
    await generator.generate(projectDir);

    // Structure
    expect(await fs.pathExists(path.join(projectDir, 'stackr.config.json'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'docker-compose.yml'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'docker-compose.prod.yml'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'auth/backend'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'core/backend'))).toBe(true);

    // stackr.config.json is parseable and has 2 services
    const cfg = await fs.readJSON(path.join(projectDir, 'stackr.config.json'));
    expect(cfg.services.length).toBe(2);
    expect(cfg.services.map((s: { name: string }) => s.name)).toEqual(['auth', 'core']);

    // docker-compose.yml parses and has managed marker blocks
    const dev = await fs.readFile(path.join(projectDir, 'docker-compose.yml'), 'utf-8');
    expect(dev).toContain('# >>> stackr managed services >>>');
    expect(dev).toContain('# <<< stackr managed services <<<');
    const parsed = YAML.parse(dev);
    expect(Object.keys(parsed.services)).toContain('auth_rest_api');
    expect(Object.keys(parsed.services)).toContain('core_rest_api');
  });

  it('generates a 4-service monorepo (auth + core + scout + manage)', async () => {
    const cfg = cloneInitConfig(minimalConfig);
    cfg.projectName = 'multi-e2e';
    cfg.services.push(
      coreEntry({
        name: 'scout',
        backend: { port: 8081, eventQueue: false, imageUploads: false, authMiddleware: 'flexible' },
      }),
      coreEntry({
        name: 'manage',
        backend: { port: 8083, eventQueue: false, imageUploads: false, authMiddleware: 'role-gated', roles: ['admin'] },
      })
    );
    // Update authConfig.provisioningTargets
    const auth = cfg.services.find((s) => s.kind === 'auth')!;
    auth.authConfig!.provisioningTargets = ['core', 'scout', 'manage'];

    const projectDir = path.join(tempDir, cfg.projectName);
    const generator = new MonorepoGenerator(cfg);
    await generator.generate(projectDir);

    // 4 services on disk
    for (const name of ['auth', 'core', 'scout', 'manage']) {
      expect(await fs.pathExists(path.join(projectDir, name, 'backend'))).toBe(true);
    }

    // auth's lib/auth.ts references all 3 peer services
    const authLib = await fs.readFile(
      path.join(projectDir, 'auth/backend/lib/auth.ts'),
      'utf-8'
    );
    expect(authLib).toContain('hasCoreAccount');
    expect(authLib).toContain('hasScoutAccount');
    expect(authLib).toContain('hasManageAccount');

    // non-auth services have AUTH_SERVICE_URL in docker-compose
    const dev = await fs.readFile(path.join(projectDir, 'docker-compose.yml'), 'utf-8');
    const parsed = YAML.parse(dev);
    expect(JSON.stringify(parsed.services.scout_rest_api)).toContain('AUTH_SERVICE_URL');
    expect(JSON.stringify(parsed.services.manage_rest_api)).toContain('AUTH_SERVICE_URL');
    expect(JSON.stringify(parsed.services.auth_rest_api)).not.toContain('AUTH_SERVICE_URL');
  });
});
