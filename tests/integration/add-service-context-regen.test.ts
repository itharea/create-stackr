import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runAddService } from '../../src/commands/add-service.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * `stackr add service` must refresh the agent-context backbone for the new
 * service — the drift gap the old standalone AI-tool pass left open. Uses a
 * Drizzle fixture so the no-auth-tables sg-rule's `files` list is exercised.
 */
describe('add service — agent context regen', () => {
  let fixture: AddServiceFixture | null = null;

  afterEach(async () => {
    if (fixture) await fixture.cleanup();
    fixture = null;
  });

  it('refreshes the root AGENTS.md, nested AGENTS.md, and the no-auth-tables rule for the new service', async () => {
    fixture = await createAddServiceFixture('regen-mono', { orm: 'drizzle' });
    const { projectDir } = fixture;

    await runAddService('wallet', { install: false });

    // Root AGENTS.md now lists the new service.
    const root = await fs.readFile(path.join(projectDir, 'AGENTS.md'), 'utf-8');
    expect(root).toContain('wallet');

    // Nested AGENTS.md was emitted for the new service + its backend subsystem.
    expect(await fs.pathExists(path.join(projectDir, 'wallet/AGENTS.md'))).toBe(true);
    const backend = await fs.readFile(path.join(projectDir, 'wallet/backend/AGENTS.md'), 'utf-8');
    expect(backend).toMatch(/ErrorFactory\.databaseError/);

    // The Drizzle no-auth-tables rule's `files` list now scans the new service.
    const rule = await fs.readFile(
      path.join(projectDir, '.stackr/sg-rules/no-auth-tables-outside-auth.yml'),
      'utf-8'
    );
    expect(rule).toContain('wallet/backend/drizzle/');
    // ...and still never targets the auth service.
    expect(rule).not.toMatch(/^\s*-\s*"auth\/backend\/drizzle/m);
  });

  it('regenerates the CLAUDE.md bridge and keeps it pointing at AGENTS.md', async () => {
    fixture = await createAddServiceFixture('regen-claude', { orm: 'drizzle', aiTools: ['codex', 'claude'] });
    const { projectDir } = fixture;

    await runAddService('ledger', { install: false });

    const claude = await fs.readFile(path.join(projectDir, 'CLAUDE.md'), 'utf-8');
    expect(claude).toMatch(/^@AGENTS\.md/);
    // Claude layer present → settings hook regenerated too.
    expect(await fs.pathExists(path.join(projectDir, '.claude/settings.json'))).toBe(true);
  });
});
