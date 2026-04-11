import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runAddService } from '../../src/commands/add-service.js';
import { loadStackrConfig, saveStackrConfig } from '../../src/utils/config-file.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * Exercises `assertVersionCompatibility`: if stackr.config.json was
 * written by a newer CLI, the current CLI refuses before mutating the
 * project.
 */
describe('stackr add service — stackrVersion compatibility guard', () => {
  let fx: AddServiceFixture;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fx = await createAddServiceFixture('version-mismatch');
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Overwrite stackrVersion with an implausibly high value.
    const cfg = await loadStackrConfig(fx.projectDir);
    cfg.stackrVersion = '999.0.0';
    await saveStackrConfig(fx.projectDir, cfg);
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fx.cleanup();
  });

  it('refuses to add a service when the on-disk config is newer than the CLI', async () => {
    await expect(
      runAddService('scout', { install: false })
    ).rejects.toThrow(/999\.0\.0/);
    await expect(
      runAddService('scout', { install: false })
    ).rejects.toThrow(/upgrade your installed/);
  });
});
