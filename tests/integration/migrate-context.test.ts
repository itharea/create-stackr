import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runMigrateContext } from '../../src/commands/migrate-context.js';
import { runDoctor } from '../../src/commands/doctor.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * `stackr migrate context` — upgrade an existing project's agent-context layer
 * to the current format. Idempotent (re-run = no-op), retires the legacy flat
 * rule files, and leaves the project in a `doctor`-clean state.
 */
describe('stackr migrate context', () => {
  let fixture: AddServiceFixture | null = null;

  afterEach(async () => {
    if (fixture) await fixture.cleanup();
    fixture = null;
  });

  it('--dry-run reports the plan without touching disk', async () => {
    fixture = await createAddServiceFixture('mig-dry', { orm: 'drizzle', aiTools: ['codex', 'cursor'] });
    const { projectDir } = fixture;
    // Plant a legacy file the migration should plan to retire.
    await fs.writeFile(path.join(projectDir, '.cursorrules'), 'LEGACY\n');

    const result = await runMigrateContext({ dryRun: true });
    expect(result.dryRun).toBe(true);
    expect(result.writes).toContain('AGENTS.md');
    expect(result.legacyRetired).toContain('.cursorrules');
    // dry run touched nothing: the legacy file is still on disk.
    expect(await fs.pathExists(path.join(projectDir, '.cursorrules'))).toBe(true);
  });

  it('migrates a legacy layout (flat .cursorrules → .cursor/rules) and is idempotent', async () => {
    fixture = await createAddServiceFixture('mig-run', { orm: 'drizzle', aiTools: ['codex', 'cursor'] });
    const { projectDir } = fixture;

    // Simulate a legacy on-disk layout: flat file present, glob dir absent.
    await fs.writeFile(path.join(projectDir, '.cursorrules'), 'LEGACY\n');
    await fs.remove(path.join(projectDir, '.cursor/rules'));

    const first = await runMigrateContext();
    expect(first.dryRun).toBe(false);
    expect(first.legacyRetired).toContain('.cursorrules');
    expect(await fs.pathExists(path.join(projectDir, '.cursorrules'))).toBe(false);
    expect(await fs.pathExists(path.join(projectDir, '.cursor/rules/backend-domain.mdc'))).toBe(true);

    // Idempotent: a second run leaves a doctor-clean project.
    await runMigrateContext();
    expect((await runDoctor()).drift).toEqual([]);
  });
});
