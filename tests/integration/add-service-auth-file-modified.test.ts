import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runAddService } from '../../src/commands/add-service.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * When the user has hand-modified `auth/backend/lib/auth.ts`, stackr must
 * NOT blindly overwrite it. Instead we write the regenerated contents to
 * `auth.ts.stackr-new` and leave the live file alone. The pending
 * migration is still recorded because the DB schema still needs to change.
 */
describe('stackr add service — auth file hand-modified', () => {
  let fx: AddServiceFixture;

  beforeEach(async () => {
    fx = await createAddServiceFixture('phase3-auth-mod');
  });

  afterEach(async () => {
    await fx.cleanup();
  });

  it('writes .stackr-new on collision and preserves live file AND still appends pendingMigration', async () => {
    const authPath = path.join(fx.projectDir, 'auth/backend/lib/auth.ts');
    const userMarker = '// USER EDIT — do not clobber';
    const original = await fs.readFile(authPath, 'utf-8');
    const modified = userMarker + '\n' + original;
    await fs.writeFile(authPath, modified, 'utf-8');

    await runAddService('wallet', { install: false });

    // Live file STILL contains the user marker (untouched)
    const liveAfter = await fs.readFile(authPath, 'utf-8');
    expect(liveAfter).toContain(userMarker);

    // Staged regenerated file exists with the new additionalField
    const stagedPath = authPath + '.stackr-new';
    expect(await fs.pathExists(stagedPath)).toBe(true);
    const staged = await fs.readFile(stagedPath, 'utf-8');
    expect(staged).toContain('hasWalletAccount');
    expect(staged).not.toContain(userMarker);

    // Pending migration is still appended
    const cfg = await loadStackrConfig(fx.projectDir);
    expect(cfg.pendingMigrations).toHaveLength(1);
    expect(cfg.pendingMigrations![0].service).toBe('auth');
  });
});
