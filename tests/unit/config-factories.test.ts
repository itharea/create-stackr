import { describe, it, expect } from 'vitest';
import { defaultInitBody } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';
import { validateConfiguration } from '../../src/utils/validation.js';
import type { InitConfig } from '../../src/types/index.js';

/**
 * Tests for the service-entry factories module: the internal
 * `defaultInitBody()` backing `--defaults`, and `applyCliOptionsToPreset`'s
 * CLI-override behaviour. There are no user-facing presets anymore — the
 * interactive flow always asks the user what to build.
 */
describe('defaultInitBody', () => {
  const body = defaultInitBody();

  it('uses Drizzle and is the non-customized built-in default', () => {
    expect(body.orm).toBe('drizzle');
    expect(body.preset).toBe('default');
    expect(body.customized).toBe(false);
  });

  it('has exactly one auth service with the admin dashboard enabled', () => {
    const auth = body.services.filter((s) => s.kind === 'auth');
    expect(auth).toHaveLength(1);
    expect(auth[0].authConfig?.adminDashboard).toBe(true);
    // adminDashboard:true makes authEntry emit a web app for the dashboard.
    expect(auth[0].web?.enabled).toBe(true);
  });

  it('has one base service named "core" with auth provisioning wired', () => {
    const base = body.services.filter((s) => s.kind === 'base');
    expect(base).toHaveLength(1);
    expect(base[0].name).toBe('core');
    const auth = body.services.find((s) => s.kind === 'auth')!;
    expect(auth.authConfig?.provisioningTargets).toEqual(['core']);
  });

  it('every backend port is unique', () => {
    const ports = body.services.map((s) => s.backend.port);
    expect(new Set(ports).size).toBe(ports.length);
  });

  it('validates after applyCliOptionsToPreset', () => {
    const full: InitConfig = applyCliOptionsToPreset(defaultInitBody(), 'smoke-test', 'npm', {});
    expect(validateConfiguration(full).valid, validateConfiguration(full).error).toBe(true);
  });

  it('applyCliOptionsToPreset stamps projectName / packageManager / appScheme', () => {
    const full = applyCliOptionsToPreset(defaultInitBody(), 'my-app', 'bun', {});
    expect(full.projectName).toBe('my-app');
    expect(full.packageManager).toBe('bun');
    expect(full.appScheme).toBe('myapp');
  });
});

describe('applyCliOptionsToPreset CLI overrides', () => {
  it('--no-auth strips the auth service and forces middleware=none', () => {
    const full = applyCliOptionsToPreset(defaultInitBody(), 'no-auth-app', 'npm', { auth: false });
    expect(full.services.find((s) => s.kind === 'auth')).toBeUndefined();
    for (const svc of full.services) {
      expect(svc.backend.authMiddleware).toBe('none');
    }
    expect(validateConfiguration(full).valid).toBe(true);
  });

  it('--service-name renames the first base service', () => {
    const full = applyCliOptionsToPreset(defaultInitBody(), 'named-app', 'npm', { serviceName: 'wallet' });
    const base = full.services.find((s) => s.kind === 'base');
    expect(base?.name).toBe('wallet');
  });

  it('--with-services adds the extra services and re-syncs provisioningTargets', () => {
    const full = applyCliOptionsToPreset(defaultInitBody(), 'multi-app', 'npm', {
      withServices: 'scout,manage',
    });
    const names = full.services.map((s) => s.name).sort();
    expect(names).toContain('scout');
    expect(names).toContain('manage');

    const auth = full.services.find((s) => s.kind === 'auth');
    const targets = (auth?.authConfig?.provisioningTargets ?? []).slice().sort();
    const baseNames = full.services
      .filter((s) => s.kind === 'base')
      .map((s) => s.name)
      .sort();
    expect(targets).toEqual(baseNames);

    expect(validateConfiguration(full).valid).toBe(true);
  });
});
