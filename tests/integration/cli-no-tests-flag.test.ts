import { describe, it, expect } from 'vitest';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';
import { loadPreset } from '../../src/config/presets.js';

/**
 * `--no-tests` on `create-stackr` must set `backend.tests: false` on EVERY
 * service that ends up in the final `InitConfig`, including ones the
 * preset defines and ones constructed later by `--service-name` or
 * `--with-services`. This locks down the ordering in
 * `applyCliOptionsToPreset` — the `--no-tests` sweep must run last so it
 * reaches services added by every branch.
 */
describe('--no-tests flag', () => {
  it('sets backend.tests: false on every service in --defaults + --no-tests run', () => {
    const cfg = applyCliOptionsToPreset(
      loadPreset('minimal'),
      'foo-no-tests',
      'npm',
      { defaults: true, tests: false }
    );
    expect(cfg.services.length).toBeGreaterThan(0);
    for (const svc of cfg.services) {
      expect(svc.backend.tests, `${svc.name} should be tests: false`).toBe(false);
    }
  });

  it('default --defaults run (no flag) leaves backend.tests: true on every service', () => {
    const cfg = applyCliOptionsToPreset(
      loadPreset('minimal'),
      'foo-tests',
      'npm',
      { defaults: true }
    );
    expect(cfg.services.length).toBeGreaterThan(0);
    for (const svc of cfg.services) {
      expect(svc.backend.tests, `${svc.name} should be tests: true`).toBe(true);
    }
  });

  it('--no-tests + --with-services reaches extras added by the CSV flag', () => {
    const cfg = applyCliOptionsToPreset(
      loadPreset('minimal'),
      'foo-no-tests-extra',
      'npm',
      { defaults: true, tests: false, withServices: 'scout,manage' }
    );
    const names = cfg.services.map((s) => s.name);
    expect(names).toContain('scout');
    expect(names).toContain('manage');
    for (const svc of cfg.services) {
      expect(svc.backend.tests, `${svc.name} should be tests: false`).toBe(false);
    }
  });

  it('--no-tests + --service-name reaches a freshly-constructed base service', () => {
    // Start from a body that has no base service so --service-name has to
    // construct a fresh one via coreEntry.
    const body = loadPreset('minimal');
    // Strip the base service so only auth remains — --no-auth would also
    // do this at runtime, but we simulate directly here.
    const bodyNoBase = {
      ...body,
      services: body.services.filter((s) => s.kind === 'auth'),
    };

    const cfg = applyCliOptionsToPreset(
      bodyNoBase,
      'foo-no-tests-custom',
      'npm',
      { defaults: true, tests: false, serviceName: 'api' }
    );
    const api = cfg.services.find((s) => s.name === 'api')!;
    expect(api).toBeDefined();
    expect(api.backend.tests).toBe(false);
    for (const svc of cfg.services) {
      expect(svc.backend.tests).toBe(false);
    }
  });

  it('--with-services extras without --no-tests default to tests: true', () => {
    const cfg = applyCliOptionsToPreset(
      loadPreset('minimal'),
      'foo-extras-tests',
      'npm',
      { defaults: true, withServices: 'scout,manage' }
    );
    for (const svc of cfg.services) {
      expect(svc.backend.tests, `${svc.name} should be tests: true`).toBe(true);
    }
  });
});
