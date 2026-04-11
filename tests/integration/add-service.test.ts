import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';
import { runAddService } from '../../src/commands/add-service.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * Primary integration test for `stackr add service`. Exercises the full
 * five-phase algorithm end-to-end against a real filesystem fixture.
 */
describe('stackr add service — primary flow', () => {
  let fx: AddServiceFixture;

  beforeEach(async () => {
    fx = await createAddServiceFixture('phase3-primary');
  });

  afterEach(async () => {
    await fx.cleanup();
  });

  it('scaffolds a new service directory with backend files', async () => {
    await runAddService('scout', { install: false });

    expect(await fs.pathExists(path.join(fx.projectDir, 'scout/backend'))).toBe(true);
    expect(
      await fs.pathExists(path.join(fx.projectDir, 'scout/backend/package.json'))
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(fx.projectDir, 'scout/backend/controllers/rest-api/server.ts')
      )
    ).toBe(true);
  });

  it('adds the new service entry to stackr.config.json', async () => {
    await runAddService('scout', { install: false });

    const cfg = await loadStackrConfig(fx.projectDir);
    expect(cfg.services).toHaveLength(3);
    const names = cfg.services.map((s) => s.name).sort();
    expect(names).toEqual(['auth', 'core', 'scout']);
    const scout = cfg.services.find((s) => s.name === 'scout');
    expect(scout?.kind).toBe('base');
    expect(scout?.backend.authMiddleware).toBe('standard');
  });

  it('injects the new service into the docker-compose managed block', async () => {
    await runAddService('scout', { install: false });

    const compose = await fs.readFile(
      path.join(fx.projectDir, 'docker-compose.yml'),
      'utf-8'
    );
    const parsed = YAML.parse(compose);
    const services = Object.keys(parsed.services);
    expect(services).toContain('scout_db');
    expect(services).toContain('scout_redis');
    expect(services).toContain('scout_rest_api');
    // The managed block still contains the marker comments.
    expect(compose).toContain('# >>> stackr managed services >>>');
    expect(compose).toContain('# <<< stackr managed services <<<');
  });

  it('regenerates auth/backend/lib/auth.ts with new hasScoutAccount field', async () => {
    await runAddService('scout', { install: false });

    const authLib = await fs.readFile(
      path.join(fx.projectDir, 'auth/backend/lib/auth.ts'),
      'utf-8'
    );
    expect(authLib).toContain('hasScoutAccount');
    expect(authLib).toContain('hasCoreAccount'); // existing one preserved
  });

  it('appends the prefixed env keys inside the managed .env block', async () => {
    await runAddService('scout', { install: false });

    const envContent = await fs.readFile(path.join(fx.projectDir, '.env'), 'utf-8');
    expect(envContent).toContain('SCOUT_DB_PASSWORD');
    expect(envContent).toContain('SCOUT_DB_USER');
    expect(envContent).toContain('SCOUT_DB_NAME');
    expect(envContent).toContain('SCOUT_REDIS_PASSWORD');
  });

  it('records exactly one pendingMigration entry for auth', async () => {
    await runAddService('scout', { install: false });

    const cfg = await loadStackrConfig(fx.projectDir);
    expect(cfg.pendingMigrations).toBeDefined();
    expect(cfg.pendingMigrations).toHaveLength(1);
    expect(cfg.pendingMigrations![0].service).toBe('auth');
    expect(cfg.pendingMigrations![0].reason).toContain('hasScoutAccount');
  });

  it('extends auth.authConfig.provisioningTargets with the new service', async () => {
    await runAddService('wallet', { install: false });
    const cfg = await loadStackrConfig(fx.projectDir);
    const auth = cfg.services.find((s) => s.kind === 'auth');
    expect(auth?.authConfig?.provisioningTargets).toContain('wallet');
    expect(auth?.authConfig?.provisioningTargets).toContain('core'); // preserved
  });
});
