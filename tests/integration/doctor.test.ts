import { describe, it, expect, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { runDoctor } from '../../src/commands/doctor.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * `stackr doctor` — a rendered-vs-disk diff of the agent-context layer, sourced
 * from stackr.config.json via the same generator as init. A freshly generated
 * project is in sync; hand-edits / missing files / stale artifacts surface as
 * drift, and `--fix` brings it back to byte-identical.
 */
describe('stackr doctor', () => {
  let fixture: AddServiceFixture | null = null;

  afterEach(async () => {
    if (fixture) await fixture.cleanup();
    fixture = null;
  });

  it('reports no drift on a freshly generated project', async () => {
    fixture = await createAddServiceFixture('doctor-clean', { orm: 'drizzle', aiTools: ['codex', 'cursor', 'claude'] });
    const result = await runDoctor();
    expect(result.drift).toEqual([]);
    expect(result.fixed).toBe(false);
  });

  it('detects a modified artifact and a stale legacy file, then --fix repairs both', async () => {
    fixture = await createAddServiceFixture('doctor-drift', { orm: 'drizzle', aiTools: ['codex', 'cursor'] });
    const { projectDir } = fixture;

    // Corrupt a generated file + plant a stale legacy .cursorrules.
    await fs.writeFile(path.join(projectDir, 'AGENTS.md'), 'hand-edited junk\n');
    await fs.writeFile(path.join(projectDir, '.cursorrules'), 'STALE\n');

    const report = await runDoctor();
    expect(report.fixed).toBe(false);
    expect(report.drift.some((d) => d.rel === 'AGENTS.md' && d.kind === 'modified')).toBe(true);
    expect(report.drift.some((d) => d.rel === '.cursorrules' && d.kind === 'stale')).toBe(true);

    const fixed = await runDoctor({ fix: true });
    expect(fixed.fixed).toBe(true);

    // Re-run is clean: regenerated AGENTS.md, removed legacy file.
    expect(await fs.pathExists(path.join(projectDir, '.cursorrules'))).toBe(false);
    expect((await runDoctor()).drift).toEqual([]);
  });

  it('detects a missing artifact', async () => {
    fixture = await createAddServiceFixture('doctor-missing', { orm: 'drizzle', aiTools: ['codex'] });
    const { projectDir } = fixture;
    await fs.remove(path.join(projectDir, 'sgconfig.yml'));
    const report = await runDoctor();
    expect(report.drift.some((d) => d.rel === 'sgconfig.yml' && d.kind === 'missing')).toBe(true);
  });
});
