import { describe, it, expect } from 'vitest';
import { buildBackendPackageJson, buildMobilePackageJson } from '../../src/utils/package.js';
import { buildServiceContext } from '../../src/generators/service-context.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { fullFeaturedConfig } from '../fixtures/configs/full-featured.js';
import { cloneInitConfig, cloneService } from '../fixtures/configs/index.js';

describe('buildBackendPackageJson', () => {
  it('names the package <projectName>-<service.name>-backend', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const pkg = buildBackendPackageJson(core, minimalConfig.projectName);
    expect(pkg.name).toBe('test-minimal-core-backend');
  });

  it('includes fastify and the active ORM client in core deps', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const pkg = buildBackendPackageJson(core, minimalConfig.projectName);
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps.fastify).toBeDefined();
    expect(deps['@prisma/client']).toBeDefined();
  });

  it('includes bullmq only when service.backend.eventQueue is true', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const withoutQueue = buildBackendPackageJson(core, minimalConfig.projectName);
    expect((withoutQueue.dependencies as Record<string, string>).bullmq).toBeUndefined();

    const withQueue = cloneService(core);
    withQueue.backend.eventQueue = true;
    const pkg = buildBackendPackageJson(withQueue, minimalConfig.projectName);
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps.bullmq).toBeDefined();
  });

  it('emits event-queue scripts only when eventQueue is true', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const withoutQueue = buildBackendPackageJson(core, minimalConfig.projectName);
    const scriptsNo = withoutQueue.scripts as Record<string, string>;
    expect(scriptsNo['dev:event-queue']).toBeUndefined();
    expect(scriptsNo['start:event-queue']).toBeUndefined();
    expect(scriptsNo['dev:rest-api']).toBeDefined();

    const withQueue = cloneService(core);
    withQueue.backend.eventQueue = true;
    const pkg = buildBackendPackageJson(withQueue, minimalConfig.projectName);
    const scripts = pkg.scripts as Record<string, string>;
    expect(scripts['dev:event-queue']).toBeDefined();
    expect(scripts['start:event-queue']).toBeDefined();
  });

  it('does NOT include better-auth in a base service', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const pkg = buildBackendPackageJson(core, minimalConfig.projectName);
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps['better-auth']).toBeUndefined();
  });

  it('projects the <svc>-backend description with the service name', () => {
    const core = minimalConfig.services.find((s) => s.name === 'core')!;
    const pkg = buildBackendPackageJson(core, minimalConfig.projectName);
    expect(pkg.description).toContain('core');
    expect(pkg.description).toContain('test-minimal');
  });

  it('parameterizes name by service name for multi-service configs', () => {
    const cloned = cloneInitConfig(minimalConfig);
    cloned.projectName = 'multi';
    const core = cloned.services.find((s) => s.name === 'core')!;
    const renamed = cloneService(core);
    renamed.name = 'scout';
    const corePkg = buildBackendPackageJson(core, cloned.projectName);
    const scoutPkg = buildBackendPackageJson(renamed, cloned.projectName);
    expect(corePkg.name).toBe('multi-core-backend');
    expect(scoutPkg.name).toBe('multi-scout-backend');
  });
});

describe('buildMobilePackageJson', () => {
  it('names the package <projectName>-<service.name>-mobile', () => {
    const core = fullFeaturedConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(fullFeaturedConfig, core);
    const pkg = buildMobilePackageJson(core, fullFeaturedConfig.projectName, ctx.features);
    expect(pkg.name).toBe('test-full-featured-core-mobile');
  });

  it('includes core Expo deps unconditionally', () => {
    const core = fullFeaturedConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(fullFeaturedConfig, core);
    const pkg = buildMobilePackageJson(core, fullFeaturedConfig.projectName, ctx.features);
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps.expo).toBeDefined();
    expect(deps['expo-router']).toBeDefined();
    expect(deps.react).toBeDefined();
    expect(deps['react-native']).toBeDefined();
  });

  it('includes auth mobile deps when authentication is enabled', () => {
    const core = fullFeaturedConfig.services.find((s) => s.name === 'core')!;
    const ctx = buildServiceContext(fullFeaturedConfig, core);
    const pkg = buildMobilePackageJson(core, fullFeaturedConfig.projectName, ctx.features);
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps.axios).toBeDefined();
    expect(deps['expo-secure-store']).toBeDefined();
  });

  it('omits RevenueCat unless service.integrations.revenueCat.enabled', () => {
    const cloned = cloneInitConfig(fullFeaturedConfig);
    const core = cloned.services.find((s) => s.name === 'core')!;
    core.integrations.revenueCat.enabled = false;

    const ctx = buildServiceContext(cloned, core);
    const pkg = buildMobilePackageJson(core, cloned.projectName, ctx.features);
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps['react-native-purchases']).toBeUndefined();

    core.integrations.revenueCat.enabled = true;
    const ctx2 = buildServiceContext(cloned, core);
    const pkg2 = buildMobilePackageJson(core, cloned.projectName, ctx2.features);
    const deps2 = pkg2.dependencies as Record<string, string>;
    expect(deps2['react-native-purchases']).toBeDefined();
  });

  it('omits Adjust unless service.integrations.adjust.enabled', () => {
    const cloned = cloneInitConfig(fullFeaturedConfig);
    const core = cloned.services.find((s) => s.name === 'core')!;
    core.integrations.adjust.enabled = false;

    const ctx = buildServiceContext(cloned, core);
    const pkg = buildMobilePackageJson(core, cloned.projectName, ctx.features);
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps['react-native-adjust']).toBeUndefined();
  });

  it('omits Scate unless service.integrations.scate.enabled', () => {
    const cloned = cloneInitConfig(fullFeaturedConfig);
    const core = cloned.services.find((s) => s.name === 'core')!;
    core.integrations.scate.enabled = false;

    const ctx = buildServiceContext(cloned, core);
    const pkg = buildMobilePackageJson(core, cloned.projectName, ctx.features);
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps['scatesdk-react']).toBeUndefined();
  });

  it('omits ATT unless service.integrations.att.enabled', () => {
    const cloned = cloneInitConfig(fullFeaturedConfig);
    const core = cloned.services.find((s) => s.name === 'core')!;
    core.integrations.att.enabled = false;

    const ctx = buildServiceContext(cloned, core);
    const pkg = buildMobilePackageJson(core, cloned.projectName, ctx.features);
    const deps = pkg.dependencies as Record<string, string>;
    expect(deps['expo-tracking-transparency']).toBeUndefined();
  });

  it('parameterizes name by service name', () => {
    const cloned = cloneInitConfig(fullFeaturedConfig);
    cloned.projectName = 'multi';
    const core = cloned.services.find((s) => s.name === 'core')!;
    const scout = cloneService(core);
    scout.name = 'scout';

    const ctxCore = buildServiceContext(cloned, core);
    const corePkg = buildMobilePackageJson(core, cloned.projectName, ctxCore.features);
    const scoutPkg = buildMobilePackageJson(scout, cloned.projectName, ctxCore.features);

    expect(corePkg.name).toBe('multi-core-mobile');
    expect(scoutPkg.name).toBe('multi-scout-mobile');
  });
});
