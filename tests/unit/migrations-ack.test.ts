import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { runMigrationsAck } from '../../src/commands/migrations-ack.js';
import { saveStackrConfig, loadStackrConfig } from '../../src/utils/config-file.js';
import type { StackrConfigFile, PendingMigration } from '../../src/types/config-file.js';

/**
 * Unit tests for `stackr migrations ack <service>`. The command is trivial
 * (<30 LoC) so these tests mostly assert the three-case contract:
 *   1. exactly one entry removed per call (stacking is allowed)
 *   2. unknown service → no-op, no error
 *   3. the updated config round-trips through saveStackrConfig
 */
describe('migrations-ack', () => {
  let tempDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'migrations-ack-test-'));
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempDir);
  });

  afterEach(async () => {
    cwdSpy.mockRestore();
    await fs.remove(tempDir);
  });

  function baseConfig(pending: PendingMigration[] | undefined): StackrConfigFile {
    return {
      version: 1,
      stackrVersion: '0.5.0',
      projectName: 'test',
      createdAt: new Date().toISOString(),
      packageManager: 'bun',
      orm: 'drizzle',
      aiTools: [],
      appScheme: 'test',
      services: [],
      ...(pending ? { pendingMigrations: pending } : {}),
    };
  }

  function mkEntry(service: string, reason = 'test'): PendingMigration {
    return {
      service,
      reason,
      createdAt: new Date().toISOString(),
      createdBy: '0.5.0',
      command: `cd ${service}/backend && bun run migrate`,
    };
  }

  it('removes the first matching entry and persists', async () => {
    await saveStackrConfig(
      tempDir,
      baseConfig([mkEntry('auth', 'added hasWalletAccount'), mkEntry('core', 'other')])
    );

    await runMigrationsAck('auth');

    const cfg = await loadStackrConfig(tempDir);
    expect(cfg.pendingMigrations).toHaveLength(1);
    expect(cfg.pendingMigrations![0].service).toBe('core');
  });

  it('removes exactly one entry per call when stacked', async () => {
    await saveStackrConfig(
      tempDir,
      baseConfig([
        mkEntry('auth', 'first'),
        mkEntry('auth', 'second'),
        mkEntry('auth', 'third'),
      ])
    );

    await runMigrationsAck('auth');
    let cfg = await loadStackrConfig(tempDir);
    expect(cfg.pendingMigrations).toHaveLength(2);
    expect(cfg.pendingMigrations![0].reason).toBe('second');

    await runMigrationsAck('auth');
    cfg = await loadStackrConfig(tempDir);
    expect(cfg.pendingMigrations).toHaveLength(1);
    expect(cfg.pendingMigrations![0].reason).toBe('third');
  });

  it('drops pendingMigrations entirely when the last entry is acked', async () => {
    await saveStackrConfig(tempDir, baseConfig([mkEntry('auth')]));
    await runMigrationsAck('auth');
    const cfg = await loadStackrConfig(tempDir);
    expect(cfg.pendingMigrations).toBeUndefined();
  });

  it('no-ops on unknown service and does not throw', async () => {
    await saveStackrConfig(tempDir, baseConfig([mkEntry('auth')]));
    await expect(runMigrationsAck('nonexistent')).resolves.not.toThrow();

    // Other entries untouched
    const cfg = await loadStackrConfig(tempDir);
    expect(cfg.pendingMigrations).toHaveLength(1);
    expect(cfg.pendingMigrations![0].service).toBe('auth');
  });

  it('no-ops when pendingMigrations is absent', async () => {
    await saveStackrConfig(tempDir, baseConfig(undefined));
    await expect(runMigrationsAck('auth')).resolves.not.toThrow();
  });

  it('preserves unrelated entries when removing one', async () => {
    await saveStackrConfig(
      tempDir,
      baseConfig([mkEntry('core'), mkEntry('auth'), mkEntry('scout')])
    );
    await runMigrationsAck('auth');
    const cfg = await loadStackrConfig(tempDir);
    const services = cfg.pendingMigrations!.map((m) => m.service);
    expect(services).toEqual(['core', 'scout']);
  });
});
