import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runAddService } from '../../src/commands/add-service.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * Exercises the `--force` regen path of `planRootEnvRegen` when the
 * stackr managed env marker block has been stripped from `.env`:
 *   - Without --force, we refuse with "marker block is missing".
 *   - With --force, we append a fresh managed block at the end, preserving
 *     the user's prior content.
 */
describe('stackr add service — force regen of root .env', () => {
  let fx: AddServiceFixture;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fx = await createAddServiceFixture('force-env');
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Replace .env with user-only content that has no managed markers.
    await fs.writeFile(
      path.join(fx.projectDir, '.env'),
      'FOO=bar\nBAZ=qux\n',
      'utf-8'
    );
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fx.cleanup();
  });

  it('refuses without --force when the managed env marker block is missing', async () => {
    await expect(
      runAddService('scout', { install: false })
    ).rejects.toThrow(/managed "env" marker block is missing/);

    // The file was not modified.
    const envContent = await fs.readFile(path.join(fx.projectDir, '.env'), 'utf-8');
    expect(envContent).toBe('FOO=bar\nBAZ=qux\n');
  });

  it('appends a fresh managed block under --force, preserving user content', async () => {
    await runAddService('scout', { install: false, force: true });

    const envContent = await fs.readFile(path.join(fx.projectDir, '.env'), 'utf-8');

    // User content preserved.
    expect(envContent).toContain('FOO=bar');
    expect(envContent).toContain('BAZ=qux');

    // Managed block exists with all four scout env keys.
    expect(envContent).toContain('# >>> stackr managed env >>>');
    expect(envContent).toContain('# <<< stackr managed env <<<');
    expect(envContent).toContain('SCOUT_DB_USER');
    expect(envContent).toContain('SCOUT_DB_PASSWORD');
    expect(envContent).toContain('SCOUT_DB_NAME');
    expect(envContent).toContain('SCOUT_REDIS_PASSWORD');

    // The managed block was APPENDED after the user content, not prepended.
    const userContentIdx = envContent.indexOf('FOO=bar');
    const managedStartIdx = envContent.indexOf('# >>> stackr managed env >>>');
    expect(userContentIdx).toBeLessThan(managedStartIdx);
  });
});
