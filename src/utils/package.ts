import type { ServiceConfig, LegacyFeaturesShim } from '../types/index.js';
import { DEPENDENCY_VERSIONS } from '../config/dependencies.js';

/**
 * Build mobile package.json for a given service.
 *
 * NOTE: The actual package.json generation in production happens via EJS
 * templates. This helper exists as a programmatic representation for
 * testing and validation. It's scoped to a single `ServiceConfig` plus the
 * monorepo-wide projectName and a feature flag snapshot (used to decide
 * whether to include the authentication mobile deps).
 */
export function buildMobilePackageJson(
  service: ServiceConfig,
  projectName: string,
  features: LegacyFeaturesShim
): Record<string, unknown> {
  const dependencies: Record<string, string> = {
    ...DEPENDENCY_VERSIONS.mobile.core,
  };

  if (features.authentication.enabled) {
    Object.assign(dependencies, DEPENDENCY_VERSIONS.mobile.authentication);
  }

  if (service.integrations.revenueCat.enabled) {
    Object.assign(dependencies, DEPENDENCY_VERSIONS.mobile.revenueCat);
  }

  if (service.integrations.adjust.enabled) {
    Object.assign(dependencies, DEPENDENCY_VERSIONS.mobile.adjust);
  }

  if (service.integrations.scate.enabled) {
    Object.assign(dependencies, DEPENDENCY_VERSIONS.mobile.scate);
  }

  if (service.integrations.att.enabled) {
    Object.assign(dependencies, DEPENDENCY_VERSIONS.mobile.att);
  }

  return {
    name: `${projectName}-${service.name}-mobile`,
    version: '1.0.0',
    description: `React Native mobile app for ${projectName} / ${service.name}`,
    main: 'expo-router/entry',
    scripts: {
      start: 'expo start',
      android: 'expo run:android',
      ios: 'expo run:ios',
      web: 'expo start --web',
      lint: 'expo lint',
      'type-check': 'tsc --noEmit',
    },
    dependencies,
    devDependencies: DEPENDENCY_VERSIONS.devDependencies.mobile,
    private: true,
  };
}

/**
 * Build backend package.json for a given service. Programmatic
 * representation for tests — real package.json rendering uses EJS.
 */
export function buildBackendPackageJson(
  service: ServiceConfig,
  projectName: string
): Record<string, unknown> {
  const dependencies: Record<string, string> = {
    ...DEPENDENCY_VERSIONS.backend.core,
  };

  if (service.backend.eventQueue) {
    Object.assign(dependencies, DEPENDENCY_VERSIONS.backend.eventQueue);
  }

  const scripts: Record<string, string> = {
    'dev:rest-api': 'bun --watch ./controllers/rest-api/index.ts | pino-pretty --colorize',
    build: 'bun run tsc',
    'start:rest-api': 'bun run dist/controllers/rest-api/index.js',
    'db:generate': 'prisma generate',
    'db:push': 'prisma db push',
    'db:migrate': 'prisma migrate dev',
    'db:studio': 'prisma studio',
    postinstall: 'prisma generate',
  };

  if (service.backend.eventQueue) {
    scripts['dev:event-queue'] = 'bun --watch ./controllers/event-queue/index.ts | pino-pretty --colorize';
    scripts['start:event-queue'] = 'bun run dist/controllers/event-queue/index.js';
  }

  return {
    name: `${projectName}-${service.name}-backend`,
    version: '1.0.0',
    description: `Backend API for ${projectName} / ${service.name}`,
    type: 'module',
    main: 'controllers/rest-api/index.ts',
    scripts,
    dependencies,
    devDependencies: DEPENDENCY_VERSIONS.devDependencies.backend,
  };
}
