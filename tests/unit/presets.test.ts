import { describe, it, expect } from 'vitest';
import { PRESETS, loadPreset } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';
import { validateConfiguration } from '../../src/utils/validation.js';
import type { InitConfig } from '../../src/types/index.js';

/**
 * Structural tests for `PRESETS`. Replaces the deleted phase-1
 * `presets.test.ts` (which tested a flat `ProjectConfig` shape). These
 * assertions are phase-2-native: services array, port uniqueness,
 * provisioningTargets wiring, post-CLI validation.
 */
describe('PRESETS structure', () => {
  it('exports exactly three presets', () => {
    expect(PRESETS).toHaveLength(3);
    const names = PRESETS.map((p) => p.name).sort();
    expect(names).toEqual(['Analytics-Focused', 'Full-Featured', 'Minimal']);
  });

  it.each(PRESETS.map((p) => [p.name]))(
    '%s preset has metadata (name, description, icon)',
    (presetName) => {
      const preset = PRESETS.find((p) => p.name === presetName)!;
      expect(preset.name).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.icon).toBeTruthy();
    }
  );
});

describe.each(PRESETS.map((p) => [p.name.toLowerCase(), p.name] as const))(
  '%s preset body',
  (presetKey, displayName) => {
    const body = loadPreset(presetKey);

    it(`${displayName}: loadPreset returns a body with services[]`, () => {
      expect(Array.isArray(body.services)).toBe(true);
      expect(body.services.length).toBeGreaterThan(0);
    });

    it(`${displayName}: exactly one service has kind === 'auth'`, () => {
      const authCount = body.services.filter((s) => s.kind === 'auth').length;
      expect(authCount).toBe(1);
    });

    it(`${displayName}: authEntry.provisioningTargets equals base service names`, () => {
      const auth = body.services.find((s) => s.kind === 'auth')!;
      const baseNames = body.services.filter((s) => s.kind === 'base').map((s) => s.name).sort();
      const targets = (auth.authConfig?.provisioningTargets ?? []).slice().sort();
      expect(targets).toEqual(baseNames);
    });

    it(`${displayName}: every backend port is unique`, () => {
      const ports = body.services.map((s) => s.backend.port);
      const unique = new Set(ports);
      expect(unique.size).toBe(ports.length);
    });

    it(`${displayName}: every enabled web port is unique`, () => {
      const webPorts = body.services
        .filter((s) => s.web?.enabled)
        .map((s) => (s.web as { port: number }).port);
      const unique = new Set(webPorts);
      expect(unique.size).toBe(webPorts.length);
    });

    it(`${displayName}: validateConfiguration(full) returns valid after applyCliOptionsToPreset`, () => {
      const full: InitConfig = applyCliOptionsToPreset(body, 'smoke-test', 'npm', {});
      const result = validateConfiguration(full);
      expect(result.valid, result.error).toBe(true);
    });

    it(`${displayName}: applyCliOptionsToPreset stamps projectName / packageManager / appScheme`, () => {
      const full = applyCliOptionsToPreset(body, 'my-app', 'bun', {});
      expect(full.projectName).toBe('my-app');
      expect(full.packageManager).toBe('bun');
      expect(full.appScheme).toBe('myapp');
    });
  }
);

describe('loadPreset error cases', () => {
  it('throws on unknown preset name', () => {
    expect(() => loadPreset('nonsense')).toThrow(/Unknown preset/);
  });

  it('is case-insensitive', () => {
    expect(() => loadPreset('MINIMAL')).not.toThrow();
    expect(() => loadPreset('Full-Featured')).not.toThrow();
    expect(() => loadPreset('analytics-focused')).not.toThrow();
  });
});

describe('applyCliOptionsToPreset CLI overrides', () => {
  it('--no-auth strips the auth service and forces middleware=none', () => {
    const body = loadPreset('minimal');
    const full = applyCliOptionsToPreset(body, 'no-auth-app', 'npm', { auth: false });
    expect(full.services.find((s) => s.kind === 'auth')).toBeUndefined();
    for (const svc of full.services) {
      expect(svc.backend.authMiddleware).toBe('none');
    }
    expect(validateConfiguration(full).valid).toBe(true);
  });

  it('--service-name renames the first base service', () => {
    const body = loadPreset('minimal');
    const full = applyCliOptionsToPreset(body, 'named-app', 'npm', { serviceName: 'wallet' });
    const base = full.services.find((s) => s.kind === 'base');
    expect(base?.name).toBe('wallet');
  });

  it('--with-services adds the extra services and re-syncs provisioningTargets', () => {
    const body = loadPreset('minimal');
    const full = applyCliOptionsToPreset(body, 'multi-app', 'npm', {
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
