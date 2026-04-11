import { describe, it, expect } from 'vitest';
import { buildServiceContext, buildStackrConfig } from '../../src/generators/service-context.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { coreEntry } from '../../src/config/presets.js';

describe('buildServiceContext', () => {
  it('populates auth service awareness for a base service in a monorepo with auth', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(minimalConfig, core);

    expect(ctx.hasAuthService).toBe(true);
    expect(ctx.authServiceName).toBe('auth');
    expect(ctx.authServicePort).toBe(8082);
    expect(ctx.authServiceUrl).toBe('http://auth_rest_api:8082');
    expect(ctx.peerServiceNames).toContain('auth');
  });

  it('populates provisioningTargets on the auth service itself', () => {
    const auth = minimalConfig.services.find((s) => s.name === 'auth')!;
    const ctx = buildServiceContext(minimalConfig, auth);

    expect(ctx.provisioningTargets).toContain('core');
    expect(ctx.peerServiceNames).toContain('core');
  });

  it('returns an empty provisioningTargets for non-auth services', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(minimalConfig, core);
    expect(ctx.provisioningTargets).toEqual([]);
  });

  it('handles the no-auth case', () => {
    const cfg = cloneInitConfig(minimalConfig);
    cfg.services = cfg.services
      .filter((s) => s.kind !== 'auth')
      .map((s) => ({
        ...s,
        backend: { ...s.backend, authMiddleware: 'none' as const },
      }));

    const core = cfg.services[0];
    const ctx = buildServiceContext(cfg, core);

    expect(ctx.hasAuthService).toBe(false);
    expect(ctx.authServiceName).toBeNull();
    expect(ctx.authServicePort).toBeNull();
    expect(ctx.authServiceUrl).toBeNull();
  });

  it('exposes the legacy shim fields mapped from service settings', () => {
    const cfg = cloneInitConfig(minimalConfig);
    const coreIdx = cfg.services.findIndex((s) => s.name === 'core');
    cfg.services[coreIdx] = coreEntry({
      name: 'core',
      backend: {
        port: 8080,
        eventQueue: true,
        imageUploads: false,
        authMiddleware: 'standard',
      },
      web: { enabled: true, port: 3000 },
      mobile: { enabled: true },
    });

    const core = cfg.services[coreIdx];
    const ctx = buildServiceContext(cfg, core);

    expect(ctx.platforms).toContain('mobile');
    expect(ctx.platforms).toContain('web');
    expect(ctx.backend.eventQueue).toBe(true);
    expect(ctx.backend.orm).toBe('prisma');
    expect(ctx.features.authentication.enabled).toBe(true);
  });
});

describe('buildStackrConfig', () => {
  it('strips integration API keys from the serialized config', () => {
    const cfg = cloneInitConfig(minimalConfig);
    const core = cfg.services.find((s) => s.name === 'core')!;
    core.integrations.revenueCat = { enabled: true, iosKey: 'leak', androidKey: 'leak' };

    const stackrCfg = buildStackrConfig(cfg);
    const json = JSON.stringify(stackrCfg);

    expect(json).not.toContain('iosKey');
    expect(json).not.toContain('androidKey');
    expect(json).not.toContain('leak');
    // But the enabled flag survives
    const serialized = stackrCfg.services.find((s) => s.name === 'core')!;
    expect(serialized.integrations?.revenueCat.enabled).toBe(true);
  });

  it('carries provisioningTargets on the auth service entry', () => {
    const stackrCfg = buildStackrConfig(minimalConfig);
    const authEntry = stackrCfg.services.find((s) => s.kind === 'auth')!;
    expect(authEntry.authConfig?.provisioningTargets).toContain('core');
  });
});
