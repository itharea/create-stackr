import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runAddService } from '../../src/commands/add-service.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * Exercises the `web: true` branch of `runAddService`:
 *   - allocateWebPort is called
 *   - the ServiceConfig is stamped with web: { enabled, port }
 *   - the <service>/web/ subtree is scaffolded
 *   - printNextSteps reports the web port
 *
 * The compose generator only emits backend services, so we do NOT assert
 * anything about docker-compose.yml web services here.
 */
describe('stackr add service — web platform', () => {
  let fx: AddServiceFixture;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fx = await createAddServiceFixture('web-flow');
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fx.cleanup();
  });

  it('allocates a web port, scaffolds scout/web, and prints the web port in next-steps', async () => {
    await runAddService('scout', { install: false, web: true });

    // 1. Config reflects the web platform on the new service.
    const cfg = await loadStackrConfig(fx.projectDir);
    const scout = cfg.services.find((s) => s.name === 'scout');
    expect(scout?.web).toEqual({ enabled: true, port: 3000 });

    // 2. Disk layout includes scout/web/
    expect(await fs.pathExists(path.join(fx.projectDir, 'scout/web'))).toBe(true);

    // 3. Next-steps output mentions the web frontend port.
    const output = logSpy.mock.calls.flat().join(' ');
    expect(output).toContain('Web frontend is exposed on port');
    expect(output).toContain('3000');
  });
});
