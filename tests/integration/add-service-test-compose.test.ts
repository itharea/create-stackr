import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';
import { runAddService } from '../../src/commands/add-service.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';
import { loadStackrConfig, saveStackrConfig } from '../../src/utils/config-file.js';

/**
 * Phase 2 add-service contract: the test compose is regenerated wholesale
 * whenever `stackr add service` runs. Different starting conditions lead
 * to different outcomes (write, preserve, delete, no-op); all four are
 * covered below.
 */
describe('stackr add service — docker-compose.test.yml handling', () => {
  let fx: AddServiceFixture;

  afterEach(async () => {
    await fx?.cleanup();
  });

  it('regenerates docker-compose.test.yml to include the new service', async () => {
    fx = await createAddServiceFixture('add-test-compose');
    await runAddService('scout', { install: false });

    const parsed = YAML.parse(
      await fs.readFile(path.join(fx.projectDir, 'docker-compose.test.yml'), 'utf-8')
    );
    const keys = Object.keys(parsed.services);
    expect(keys).toContain('scout_db_test');
    expect(keys).toContain('scout_redis_test');
    expect(keys).toContain('scout_db_migrate');
    expect(keys).toContain('scout_rest_api');
    // Pre-existing services are still present.
    expect(keys).toContain('core_db_test');
    expect(keys).toContain('auth_db_test');
  });

  it('add-service --no-tests on a tests-enabled project keeps the file and OMITS the new service', async () => {
    fx = await createAddServiceFixture('add-test-no-tests');
    await runAddService('scout', { install: false, tests: false });

    const testComposePath = path.join(fx.projectDir, 'docker-compose.test.yml');
    expect(await fs.pathExists(testComposePath)).toBe(true);

    const parsed = YAML.parse(await fs.readFile(testComposePath, 'utf-8'));
    const keys = Object.keys(parsed.services);
    // scout gets no test containers.
    expect(keys).not.toContain('scout_db_test');
    expect(keys).not.toContain('scout_rest_api');
    // Existing tests-enabled services are still there.
    expect(keys).toContain('core_db_test');
    expect(keys).toContain('auth_db_test');
  });

  it('adds with --no-tests to an all-opt-out project → file is absent', async () => {
    fx = await createAddServiceFixture('add-test-all-notests');

    // Flip every existing service to tests: false and sync to disk so
    // loadStackrConfig inside runAddService sees the opted-out state.
    const cfg = await loadStackrConfig(fx.projectDir);
    for (const svc of cfg.services) {
      svc.backend.tests = false;
    }
    await saveStackrConfig(fx.projectDir, cfg);
    await fs.remove(path.join(fx.projectDir, 'docker-compose.test.yml'));

    await runAddService('scout', { install: false, tests: false });

    expect(await fs.pathExists(path.join(fx.projectDir, 'docker-compose.test.yml'))).toBe(false);
  });

  it('deletes a stale docker-compose.test.yml when post-regen no service has tests', async () => {
    fx = await createAddServiceFixture('add-test-delete-stale');

    // Starting state: file exists (auth + core default to tests: true).
    const testComposePath = path.join(fx.projectDir, 'docker-compose.test.yml');
    expect(await fs.pathExists(testComposePath)).toBe(true);

    // Flip every existing service off so only scout (also --no-tests)
    // would be left — no service with tests, so the file should be deleted.
    const cfg = await loadStackrConfig(fx.projectDir);
    for (const svc of cfg.services) {
      svc.backend.tests = false;
    }
    await saveStackrConfig(fx.projectDir, cfg);

    await runAddService('scout', { install: false, tests: false });

    expect(await fs.pathExists(testComposePath)).toBe(false);
  });
});
