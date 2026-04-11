import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { runAddService } from '../../src/commands/add-service.js';
import { runMigrationsAck } from '../../src/commands/migrations-ack.js';
import { loadStackrConfig, saveStackrConfig } from '../../src/utils/config-file.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * The pending-migration gate is the single most important mechanism
 * preventing the "silent sign-in fails 30 minutes later" footgun. This
 * test seeds `stackr.config.json` with a pending entry, then asserts:
 *
 *   1. runAddService refuses with a clean error message
 *   2. `stackr migrations ack auth` clears the entry
 *   3. runAddService succeeds after ack
 *   4. runAddService --force bypasses the refusal AND still appends
 *      the new PendingMigration (stacking is allowed)
 */
describe('stackr add service — pending migration refusal gate', () => {
  let fx: AddServiceFixture;

  beforeEach(async () => {
    fx = await createAddServiceFixture('phase3-refusal');
    // Seed a pending migration so the next add-service call must refuse.
    const cfg = await loadStackrConfig(fx.projectDir);
    cfg.pendingMigrations = [
      {
        service: 'auth',
        reason: 'seeded test entry',
        createdAt: new Date().toISOString(),
        createdBy: '0.5.0',
        command: 'cd auth/backend && bun run prisma migrate dev',
      },
    ];
    await saveStackrConfig(fx.projectDir, cfg);
  });

  afterEach(async () => {
    await fx.cleanup();
  });

  it('refuses with a clear diagnostic when pendingMigrations is non-empty', async () => {
    await expect(runAddService('foo', { install: false })).rejects.toThrow(/pending migration/i);

    // No new service created
    const cfg = await loadStackrConfig(fx.projectDir);
    expect(cfg.services.map((s) => s.name)).not.toContain('foo');
  });

  it('clears the refusal after `stackr migrations ack auth`', async () => {
    await runMigrationsAck('auth');

    // Now it should succeed
    await expect(runAddService('foo', { install: false })).resolves.not.toThrow();
    const cfg = await loadStackrConfig(fx.projectDir);
    expect(cfg.services.map((s) => s.name)).toContain('foo');
  });

  it('--force bypasses the refusal AND stacks a new PendingMigration', async () => {
    await runAddService('foo', { install: false, force: true });

    const cfg = await loadStackrConfig(fx.projectDir);
    expect(cfg.services.map((s) => s.name)).toContain('foo');
    // Two entries now: the seeded one + the new one for the foo migration.
    expect(cfg.pendingMigrations?.length).toBeGreaterThanOrEqual(2);
    const reasons = cfg.pendingMigrations!.map((m) => m.reason);
    expect(reasons).toContain('seeded test entry');
    expect(reasons.some((r) => r.includes('hasFooAccount'))).toBe(true);
  });
});
