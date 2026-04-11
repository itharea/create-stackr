import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { runAddService } from '../../src/commands/add-service.js';
import { loadStackrConfig } from '../../src/utils/config-file.js';
import { createAddServiceFixture, type AddServiceFixture } from './add-service-helpers.js';

/**
 * Exercises the drizzle branch of `ormMigrationCommand`. Previous
 * integration tests all use the default prisma fixture, leaving the
 * drizzle-kit migration command branch uncovered.
 */
describe('stackr add service — drizzle project', () => {
  let fx: AddServiceFixture;
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    fx = await createAddServiceFixture('drizzle-flow', { orm: 'drizzle' });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    logSpy.mockRestore();
    await fx.cleanup();
  });

  it('prints the drizzle-kit migration command in the next-steps box', async () => {
    await runAddService('scout', { install: false });

    // Boxen wraps long lines and inserts border characters (│) mid-line.
    // Strip anything that isn't a letter, digit, dash, or space so we can
    // reliably substring-match across the wrap.
    const output = logSpy.mock.calls
      .flat()
      .join(' ')
      .replace(/[^a-zA-Z0-9\- ]+/g, ' ')
      .replace(/\s+/g, ' ');
    expect(output).toContain('drizzle-kit generate');
    expect(output).toContain('drizzle-kit migrate');
    expect(output).not.toContain('prisma migrate dev');
  });

  it('persists orm=drizzle and records the scout service', async () => {
    await runAddService('scout', { install: false });

    const cfg = await loadStackrConfig(fx.projectDir);
    expect(cfg.orm).toBe('drizzle');
    expect(cfg.services.map((s) => s.name)).toContain('scout');
    // The pendingMigration command should also be the drizzle command.
    expect(cfg.pendingMigrations).toBeDefined();
    expect(cfg.pendingMigrations![0].command).toContain('drizzle-kit');
  });
});
