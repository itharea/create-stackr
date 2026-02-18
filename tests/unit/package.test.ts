import { describe, it, expect } from 'vitest';
import { buildMobilePackageJson, buildBackendPackageJson } from '../../src/utils/package.js';
import type { ProjectConfig } from '../../src/types/index.js';

describe('Package Utils', () => {
  const baseConfig: ProjectConfig = {
    projectName: 'test-app',
    packageManager: 'npm',
    features: {
      onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
      authentication: false,
      paywall: false,
      sessionManagement: false,
    },
    integrations: {
      revenueCat: { enabled: false, iosKey: '', androidKey: '' },
      adjust: { enabled: false, appToken: '', environment: 'sandbox' },
      scate: { enabled: false, apiKey: '' },
      att: { enabled: false },
    },
    backend: {
      database: 'postgresql',
      eventQueue: false,
      docker: true,
    },
    preset: 'minimal',
    customized: false,
    aiTools: ['codex'],
  };

  describe('buildMobilePackageJson', () => {
    it('should build basic mobile package.json with minimal config', () => {
      const pkg = buildMobilePackageJson(baseConfig);

      expect(pkg.name).toBe('test-app-mobile');
      expect(pkg.version).toBe('1.0.0');
      expect(pkg.main).toBe('expo-router/entry');
      expect(pkg.private).toBe(true);
      expect((pkg as any).dependencies).toBeDefined();
      expect((pkg as any).devDependencies).toBeDefined();
    });

    it('should include core dependencies', () => {
      const pkg = buildMobilePackageJson(baseConfig);
      const deps = (pkg as any).dependencies;

      expect(deps.expo).toBeDefined();
      expect(deps.react).toBeDefined();
      expect(deps['react-native']).toBeDefined();
      expect(deps.zustand).toBeDefined();
      expect(deps['expo-router']).toBeDefined();
    });

    it('should include authentication dependencies when enabled', () => {
      const config = {
        ...baseConfig,
        features: { ...baseConfig.features, authentication: true },
      };
      const pkg = buildMobilePackageJson(config);
      const deps = (pkg as any).dependencies;

      expect(deps.axios).toBeDefined();
      expect(deps['@react-native-async-storage/async-storage']).toBeDefined();
      expect(deps['expo-secure-store']).toBeDefined();
    });

    it('should exclude authentication dependencies when disabled', () => {
      const pkg = buildMobilePackageJson(baseConfig);
      const deps = (pkg as any).dependencies;

      expect(deps.axios).toBeUndefined();
      expect(deps['@react-native-async-storage/async-storage']).toBeUndefined();
    });

    it('should include RevenueCat when enabled', () => {
      const config = {
        ...baseConfig,
        integrations: {
          ...baseConfig.integrations,
          revenueCat: { enabled: true, iosKey: 'test', androidKey: 'test' },
        },
      };
      const pkg = buildMobilePackageJson(config);
      const deps = (pkg as any).dependencies;

      expect(deps['react-native-purchases']).toBeDefined();
    });

    it('should include Adjust when enabled', () => {
      const config = {
        ...baseConfig,
        integrations: {
          ...baseConfig.integrations,
          adjust: { enabled: true, appToken: 'test', environment: 'production' },
        },
      };
      const pkg = buildMobilePackageJson(config);
      const deps = (pkg as any).dependencies;

      expect(deps['react-native-adjust']).toBeDefined();
    });

    it('should include Scate when enabled', () => {
      const config = {
        ...baseConfig,
        integrations: {
          ...baseConfig.integrations,
          scate: { enabled: true, apiKey: 'test' },
        },
      };
      const pkg = buildMobilePackageJson(config);
      const deps = (pkg as any).dependencies;

      expect(deps['scatesdk-react']).toBeDefined();
    });

    it('should include ATT when enabled', () => {
      const config = {
        ...baseConfig,
        integrations: {
          ...baseConfig.integrations,
          att: { enabled: true },
        },
      };
      const pkg = buildMobilePackageJson(config);
      const deps = (pkg as any).dependencies;

      expect(deps['expo-tracking-transparency']).toBeDefined();
    });

    it('should include all scripts', () => {
      const pkg = buildMobilePackageJson(baseConfig);
      const scripts = (pkg as any).scripts;

      expect(scripts.start).toBe('expo start');
      expect(scripts.android).toBe('expo run:android');
      expect(scripts.ios).toBe('expo run:ios');
      expect(scripts.web).toBe('expo start --web');
      expect(scripts.lint).toBe('expo lint');
      expect(scripts['type-check']).toBe('tsc --noEmit');
    });

    it('should handle multiple integrations enabled', () => {
      const config = {
        ...baseConfig,
        features: { ...baseConfig.features, authentication: true },
        integrations: {
          revenueCat: { enabled: true, iosKey: 'test', androidKey: 'test' },
          adjust: { enabled: true, appToken: 'test', environment: 'sandbox' },
          scate: { enabled: true, apiKey: 'test' },
          att: { enabled: true },
        },
      };
      const pkg = buildMobilePackageJson(config);
      const deps = (pkg as any).dependencies;

      expect(deps.axios).toBeDefined();
      expect(deps['react-native-purchases']).toBeDefined();
      expect(deps['react-native-adjust']).toBeDefined();
      expect(deps['scatesdk-react']).toBeDefined();
      expect(deps['expo-tracking-transparency']).toBeDefined();
    });
  });

  describe('buildBackendPackageJson', () => {
    it('should build basic backend package.json', () => {
      const pkg = buildBackendPackageJson(baseConfig);

      expect(pkg.name).toBe('test-app-backend');
      expect(pkg.version).toBe('1.0.0');
      expect(pkg.type).toBe('module');
      expect(pkg.main).toBe('controllers/rest-api/index.ts');
      expect((pkg as any).dependencies).toBeDefined();
      expect((pkg as any).devDependencies).toBeDefined();
    });

    it('should include core backend dependencies', () => {
      const pkg = buildBackendPackageJson(baseConfig);
      const deps = (pkg as any).dependencies;

      expect(deps.fastify).toBeDefined();
      expect(deps['@prisma/client']).toBeDefined();
      expect(deps.ioredis).toBeDefined();
      expect(deps.jsonwebtoken).toBeDefined();
      expect(deps.bcrypt).toBeDefined();
      expect(deps.dotenv).toBeDefined();
    });

    it('should include BullMQ when event queue enabled', () => {
      const config = {
        ...baseConfig,
        backend: { ...baseConfig.backend, eventQueue: true },
      };
      const pkg = buildBackendPackageJson(config);
      const deps = (pkg as any).dependencies;

      expect(deps.bullmq).toBeDefined();
    });

    it('should exclude BullMQ when event queue disabled', () => {
      const pkg = buildBackendPackageJson(baseConfig);
      const deps = (pkg as any).dependencies;

      expect(deps.bullmq).toBeUndefined();
    });

    it('should include base scripts', () => {
      const pkg = buildBackendPackageJson(baseConfig);
      const scripts = (pkg as any).scripts;

      expect(scripts['dev:rest-api']).toBeDefined();
      expect(scripts.build).toBe('bun run tsc');
      expect(scripts['start:rest-api']).toBeDefined();
      expect(scripts['db:generate']).toBe('prisma generate');
      expect(scripts['db:push']).toBe('prisma db push');
      expect(scripts['db:migrate']).toBe('prisma migrate dev');
      expect(scripts['db:studio']).toBe('prisma studio');
      expect(scripts.postinstall).toBe('prisma generate');
    });

    it('should include event queue scripts when enabled', () => {
      const config = {
        ...baseConfig,
        backend: { ...baseConfig.backend, eventQueue: true },
      };
      const pkg = buildBackendPackageJson(config);
      const scripts = (pkg as any).scripts;

      expect(scripts['dev:event-queue']).toBeDefined();
      expect(scripts['start:event-queue']).toBeDefined();
    });

    it('should exclude event queue scripts when disabled', () => {
      const pkg = buildBackendPackageJson(baseConfig);
      const scripts = (pkg as any).scripts;

      expect(scripts['dev:event-queue']).toBeUndefined();
      expect(scripts['start:event-queue']).toBeUndefined();
    });

    it('should include dev dependencies', () => {
      const pkg = buildBackendPackageJson(baseConfig);
      const devDeps = (pkg as any).devDependencies;

      expect(devDeps.prisma).toBeDefined();
      expect(devDeps.typescript).toBeDefined();
      expect(devDeps.tsx).toBeDefined();
      expect(devDeps['@types/node']).toBeDefined();
      expect(devDeps['@types/bcrypt']).toBeDefined();
      expect(devDeps['@types/jsonwebtoken']).toBeDefined();
    });
  });
});
