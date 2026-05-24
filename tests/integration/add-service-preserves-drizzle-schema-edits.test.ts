import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runAddService } from '../../src/commands/add-service.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * AST preservation for the drizzle variant of the auth schema. The default
 * fixture is prisma; this test stands up a drizzle project so we cover
 * the `mergeAuthSchemaDrizzle` path.
 */
describe('stackr add service — drizzle schema AST preserves user columns', () => {
  let fx: AddServiceFixture;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fx = await createAddServiceFixture('drizzle-schema-preserve', { orm: 'drizzle' });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fx.cleanup();
  });

  it('preserves a hand-added column in the user pgTable', async () => {
    const schemaPath = path.join(fx.projectDir, 'auth/backend/drizzle/schema.ts');
    const original = await fs.readFile(schemaPath, 'utf-8');

    // Add a custom user column inside the user pgTable definition.
    const modified = original.replace(
      /(role:\s*varchar\([^)]+\)[^,]+,)/,
      `$1\n  // USER CUSTOM\n  teamId: text('team_id'),`
    );
    await fs.writeFile(schemaPath, modified, 'utf-8');

    await runAddService('wallet', { install: false });

    const after = await fs.readFile(schemaPath, 'utf-8');
    expect(after).toContain('USER CUSTOM');
    expect(after).toContain('teamId');
    expect(after).toContain('hasWalletAccount');
    expect(after).toContain('has_wallet_account');
    expect(await fs.pathExists(schemaPath + '.stackr-new')).toBe(false);
  });
});
