import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runAddService } from '../../src/commands/add-service.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

describe('stackr add service — port handling', () => {
  let fx: AddServiceFixture;

  beforeEach(async () => {
    fx = await createAddServiceFixture('phase3-ports');
  });

  afterEach(async () => {
    await fx.cleanup();
  });

  it('auto-allocates the next free port when --port is not supplied', async () => {
    await runAddService('wallet', { install: false });
    const cfg = await loadStackrConfig(fx.projectDir);
    const wallet = cfg.services.find((s) => s.name === 'wallet');
    // Minimal fixture uses auth@8082, core@8080. Next free backend port
    // skipping 8082 is 8081.
    expect(wallet?.backend.port).toBe(8081);
  });

  it('refuses explicit --port that collides with an existing service', async () => {
    await expect(
      runAddService('wallet', { install: false, port: 8080 /* taken by core */ })
    ).rejects.toThrow(/already taken/i);
  });

  it('accepts an explicit free --port', async () => {
    await runAddService('wallet', { install: false, port: 9000 });
    const cfg = await loadStackrConfig(fx.projectDir);
    const wallet = cfg.services.find((s) => s.name === 'wallet');
    expect(wallet?.backend.port).toBe(9000);
  });
});
