import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import YAML from 'yaml';
import { runAddService } from '../../src/commands/add-service.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * Exercises the `--force` regen path of `planComposeRegen` when the
 * stackr marker blocks have been stripped from `docker-compose.yml`:
 *   - Without --force, we refuse with a "marker block is missing" error.
 *   - With --force, we rebuild the whole file from scratch and the new
 *     service ends up inside regenerated marker blocks.
 *
 * This covers both the services-marker-missing force path and the
 * volumes-block-missing-on-force append path in src/commands/add-service.ts.
 */
describe('stackr add service — force regen of compose file', () => {
  let fx: AddServiceFixture;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fx = await createAddServiceFixture('force-compose');
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Replace docker-compose.yml with a minimal scaffold that contains
    // NEITHER the managed "services" markers NOR any `volumes:` section.
    await fs.writeFile(
      path.join(fx.projectDir, 'docker-compose.yml'),
      'services:\n  placeholder:\n    image: busybox\n',
      'utf-8'
    );
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fx.cleanup();
  });

  it('refuses without --force when the services marker block is missing', async () => {
    await expect(
      runAddService('scout', { install: false })
    ).rejects.toThrow(/managed "services" marker block is missing/);
  });

  it('regenerates the whole file under --force and injects the new service', async () => {
    await runAddService('scout', { install: false, force: true });

    const compose = await fs.readFile(
      path.join(fx.projectDir, 'docker-compose.yml'),
      'utf-8'
    );

    // Marker blocks are back.
    expect(compose).toContain('# >>> stackr managed services >>>');
    expect(compose).toContain('# <<< stackr managed services <<<');
    expect(compose).toContain('# >>> stackr managed volumes >>>');
    expect(compose).toContain('# <<< stackr managed volumes <<<');

    // The regenerated file is valid YAML and includes the new service.
    const parsed = YAML.parse(compose);
    const serviceKeys = Object.keys(parsed.services);
    expect(serviceKeys).toContain('scout_rest_api');
    expect(serviceKeys).toContain('scout_db');
    expect(serviceKeys).toContain('scout_redis');
  });
});
