import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runAddService } from '../../src/commands/add-service.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

describe('stackr add service — name collisions', () => {
  let fx: AddServiceFixture;

  beforeEach(async () => {
    fx = await createAddServiceFixture('phase3-collision');
  });

  afterEach(async () => {
    await fx.cleanup();
  });

  it('refuses a name already present in stackr.config.json', async () => {
    await expect(runAddService('core', { install: false })).rejects.toThrow(
      /already exists/i
    );
    const cfg = await loadStackrConfig(fx.projectDir);
    expect(cfg.services.filter((s) => s.name === 'core')).toHaveLength(1);
  });

  it('refuses when a same-named directory exists but is not in the config', async () => {
    const ghostDir = path.join(fx.projectDir, 'ghost');
    await fs.ensureDir(ghostDir);
    await fs.writeFile(path.join(ghostDir, 'some-file.txt'), 'user content');

    await expect(runAddService('ghost', { install: false })).rejects.toThrow(
      /already exists/i
    );
  });

  it('refuses the reserved name "auth" (when an auth service already exists)', async () => {
    await expect(runAddService('auth', { install: false })).rejects.toThrow();
  });

  it('refuses invalid name characters', async () => {
    await expect(runAddService('Has-Caps', { install: false })).rejects.toThrow(
      /lowercase/i
    );
  });
});
