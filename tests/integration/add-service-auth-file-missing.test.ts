import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runAddService } from '../../src/commands/add-service.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * Exercises the edge case in `planAuthFileRegen` where the live
 * `auth/backend/lib/auth.ts` is missing on disk (deleted by the user).
 * The run should succeed and re-create the file in place (NOT a
 * .stackr-new collision fallback).
 */
describe('stackr add service — auth.ts deleted on disk', () => {
  let fx: AddServiceFixture;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fx = await createAddServiceFixture('auth-missing');
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    // Wipe the live auth lib file.
    await fs.remove(path.join(fx.projectDir, 'auth/backend/lib/auth.ts'));
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fx.cleanup();
  });

  it('re-creates auth.ts at its canonical path with the new peer field', async () => {
    await expect(
      runAddService('scout', { install: false })
    ).resolves.toBeUndefined();

    const authLibPath = path.join(fx.projectDir, 'auth/backend/lib/auth.ts');
    expect(await fs.pathExists(authLibPath)).toBe(true);

    const authLib = await fs.readFile(authLibPath, 'utf-8');
    expect(authLib).toContain('hasScoutAccount');

    // And we did NOT fall back to the .stackr-new collision path.
    expect(
      await fs.pathExists(
        path.join(fx.projectDir, 'auth/backend/lib/auth.ts.stackr-new')
      )
    ).toBe(false);
  });
});
