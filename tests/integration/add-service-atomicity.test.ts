import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runAddService } from '../../src/commands/add-service.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * The A–E phase ordering in runAddService is load-bearing: phases A-C
 * must not mutate any on-disk state. If dry-run validation fails (Phase C),
 * the project root should be byte-identical to its pre-run snapshot.
 *
 * We induce a Phase C failure by corrupting a marker block in
 * docker-compose.yml so writeMarkedBlock surfaces a MarkerCorruptionError
 * before we reach Phase D. Everything on disk stays as it was.
 */
describe('stackr add service — atomicity (A–E ordering)', () => {
  let fx: AddServiceFixture;

  beforeEach(async () => {
    fx = await createAddServiceFixture('phase3-atomicity');
  });

  afterEach(async () => {
    await fx.cleanup();
  });

  async function snapshot(dir: string): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const walk = async (cur: string) => {
      const entries = await fs.readdir(cur, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(cur, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          await walk(full);
        } else {
          const rel = path.relative(dir, full);
          out.set(rel, await fs.readFile(full, 'utf-8'));
        }
      }
    };
    await walk(dir);
    return out;
  }

  it('Phase C failure leaves the project byte-identical', async () => {
    // Corrupt the services marker block by duplicating the start marker,
    // so planComposeRegen → writeMarkedBlock → readMarkedBlock surfaces
    // MarkerCorruptionError inside Phase B before Phase C even runs.
    const composePath = path.join(fx.projectDir, 'docker-compose.yml');
    const original = await fs.readFile(composePath, 'utf-8');
    const corrupted = original.replace(
      '# >>> stackr managed services >>>',
      '# >>> stackr managed services >>>\n  # >>> stackr managed services >>>'
    );
    await fs.writeFile(composePath, corrupted, 'utf-8');

    const before = await snapshot(fx.projectDir);

    await expect(runAddService('wallet', { install: false })).rejects.toThrow(/corrupt/i);

    // No new service directory
    expect(await fs.pathExists(path.join(fx.projectDir, 'wallet'))).toBe(false);

    // Every file byte-identical
    const after = await snapshot(fx.projectDir);
    expect(after.size).toBe(before.size);
    for (const [rel, contentBefore] of before) {
      const contentAfter = after.get(rel);
      expect(contentAfter).toBe(contentBefore);
    }
  });

  it('Phase A failure (name collision) leaves the project byte-identical', async () => {
    const before = await snapshot(fx.projectDir);

    await expect(runAddService('core', { install: false })).rejects.toThrow(/already exists/i);

    const after = await snapshot(fx.projectDir);
    expect(after.size).toBe(before.size);
    for (const [rel, contentBefore] of before) {
      expect(after.get(rel)).toBe(contentBefore);
    }
  });
});
