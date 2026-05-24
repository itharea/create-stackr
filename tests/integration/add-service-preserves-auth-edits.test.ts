import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runAddService } from '../../src/commands/add-service.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * AST-based preservation guarantees for the auth-service files that
 * `stackr add service` regenerates. For each file family we hand-edit
 * something the user might realistically change, then add a service and
 * verify both the edit AND the new `has<Cap>Account` entry are present.
 *
 * Companion to `compose-regen-preserves-user-edits.test.ts` (compose YAML)
 * and `add-service-auth-file-modified.test.ts` (the older auth.ts case).
 */
describe('stackr add service — AST preserves auth-file user edits', () => {
  let fx: AddServiceFixture;

  beforeEach(async () => {
    fx = await createAddServiceFixture('preserves-auth-edits');
  });

  afterEach(async () => {
    await fx.cleanup();
  });

  it('preserves a custom comment + user-added property inside `additionalFields`', async () => {
    const authPath = path.join(fx.projectDir, 'auth/backend/lib/auth.ts');
    const original = await fs.readFile(authPath, 'utf-8');

    // Insert a user property (`teamId`) inside `additionalFields` AND a
    // user comment above it. Both must survive the AST merge.
    const modified = original.replace(
      /additionalFields:\s*\{/,
      'additionalFields: {\n      // USER CUSTOM\n      teamId: { type: "string", defaultValue: "", input: true },'
    );
    await fs.writeFile(authPath, modified, 'utf-8');

    await runAddService('wallet', { install: false });

    const after = await fs.readFile(authPath, 'utf-8');
    expect(after).toContain('// USER CUSTOM');
    expect(after).toContain('teamId');
    expect(after).toContain('hasWalletAccount');
    expect(await fs.pathExists(authPath + '.stackr-new')).toBe(false);
  });

  it('preserves a hand-added column in the prisma User model', async () => {
    const schemaPath = path.join(fx.projectDir, 'auth/backend/prisma/schema.prisma');
    const original = await fs.readFile(schemaPath, 'utf-8');

    // Add a user-managed column inside `model User`. AST merge should add
    // `hasWalletAccount` after it without touching the user's column.
    const modified = original.replace(
      /(model User \{[\s\S]*?role\s+String\s+@default\("user"\)\n)/,
      '$1  // USER CUSTOM\n  teamId String @default("")\n'
    );
    await fs.writeFile(schemaPath, modified, 'utf-8');

    await runAddService('wallet', { install: false });

    const after = await fs.readFile(schemaPath, 'utf-8');
    expect(after).toContain('USER CUSTOM');
    expect(after).toContain('teamId');
    expect(after).toContain('hasWalletAccount');
    expect(await fs.pathExists(schemaPath + '.stackr-new')).toBe(false);
  });

  it('hand-edit to the auth.ts imports survives the merge', async () => {
    const authPath = path.join(fx.projectDir, 'auth/backend/lib/auth.ts');
    const original = await fs.readFile(authPath, 'utf-8');

    // Inject a custom import at the top — common when users add their
    // own plugins or helpers.
    const modified = `import customHelper from "./helpers/custom.js";\n${original}`;
    await fs.writeFile(authPath, modified, 'utf-8');

    await runAddService('wallet', { install: false });

    const after = await fs.readFile(authPath, 'utf-8');
    expect(after).toMatch(/import customHelper from "\.\/helpers\/custom\.js"/);
    expect(after).toContain('hasWalletAccount');
  });
});
