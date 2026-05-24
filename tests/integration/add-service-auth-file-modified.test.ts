import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runAddService } from '../../src/commands/add-service.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * When the user has hand-modified `auth/backend/lib/auth.ts`, AST-based
 * regen preserves the modification AND inserts the new
 * `has<Cap>Account` additionalField in the right place. No `.stackr-new`
 * sidecar — the file is updated in place because the merge is additive.
 */
describe('stackr add service — auth file hand-modified (AST preservation)', () => {
  let fx: AddServiceFixture;

  beforeEach(async () => {
    fx = await createAddServiceFixture('phase3-auth-mod');
  });

  afterEach(async () => {
    await fx.cleanup();
  });

  it('preserves the user edit, adds the new field in place, records the pendingMigration', async () => {
    const authPath = path.join(fx.projectDir, 'auth/backend/lib/auth.ts');
    const userMarker = '// USER EDIT — do not clobber';
    const original = await fs.readFile(authPath, 'utf-8');
    const modified = userMarker + '\n' + original;
    await fs.writeFile(authPath, modified, 'utf-8');

    await runAddService('wallet', { install: false });

    const after = await fs.readFile(authPath, 'utf-8');
    // User comment survives untouched in place.
    expect(after).toContain(userMarker);
    // New additionalField lands without a sidecar.
    expect(after).toContain('hasWalletAccount');
    expect(
      await fs.pathExists(authPath + '.stackr-new')
    ).toBe(false);

    // Pending migration is still appended.
    const cfg = await loadStackrConfig(fx.projectDir);
    expect(cfg.pendingMigrations).toHaveLength(1);
    expect(cfg.pendingMigrations![0].service).toBe('auth');
  });
});
