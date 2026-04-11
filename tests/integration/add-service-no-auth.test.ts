import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { vi } from 'vitest';
import { runAddService } from '../../src/commands/add-service.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';

/**
 * A project generated with `--no-auth` has no auth service, so
 * `stackr add service foo --auth-middleware standard` should fail with a
 * clear diagnostic pointing at the (deferred) `stackr add auth` follow-up.
 *
 * Conversely, `stackr add service foo --auth-middleware none` succeeds
 * AND leaves `pendingMigrations` empty (there's no auth file to
 * regenerate, so no schema change).
 */
describe('stackr add service — no auth', () => {
  let tempDir: string;
  let projectDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'add-service-no-auth-'));
    projectDir = path.join(tempDir, 'no-auth');

    // Build a config with NO auth service (strip the auth entry).
    const cfg = cloneInitConfig(minimalConfig);
    cfg.projectName = 'no-auth';
    cfg.services = cfg.services.filter((s) => s.kind !== 'auth');
    // The remaining core service needs authMiddleware: 'none' to be valid.
    cfg.services[0].backend.authMiddleware = 'none';

    await new MonorepoGenerator(cfg).generate(projectDir);

    // Copy .env.example → .env so env merging has something to chew on.
    const envExample = path.join(projectDir, '.env.example');
    if (await fs.pathExists(envExample)) {
      await fs.copy(envExample, path.join(projectDir, '.env'));
    }

    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(projectDir);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await fs.remove(tempDir);
  });

  it('refuses --auth-middleware standard when no auth service exists', async () => {
    await expect(
      runAddService('foo', { install: false, authMiddleware: 'standard' })
    ).rejects.toThrow(/no auth service/i);
  });

  it('succeeds with --auth-middleware none and leaves pendingMigrations empty', async () => {
    await runAddService('foo', { install: false, authMiddleware: 'none' });

    const cfg = await loadStackrConfig(projectDir);
    expect(cfg.services.map((s) => s.name)).toContain('foo');
    expect(cfg.pendingMigrations ?? []).toHaveLength(0);
  });
});
