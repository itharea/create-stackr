import type { ProjectConfig } from '../types/index.js';
import { DEPENDENCY_VERSIONS } from '../config/dependencies.js';

/**
 * Build mobile package.json based on configuration
 *
 * NOTE: The actual package.json generation in production happens via EJS templates.
 * This function serves as a programmatic representation for testing and validation.
 */
export function buildMobilePackageJson(config: ProjectConfig): Record<string, unknown> {
  const dependencies: Record<string, string> = {
    ...DEPENDENCY_VERSIONS.mobile.core,
  };

  // Add conditional dependencies based on features
  if (config.features.authentication) {
    Object.assign(dependencies, DEPENDENCY_VERSIONS.mobile.authentication);
  }

  if (config.integrations.revenueCat.enabled) {
    Object.assign(dependencies, DEPENDENCY_VERSIONS.mobile.revenueCat);
  }

  if (config.integrations.adjust.enabled) {
    Object.assign(dependencies, DEPENDENCY_VERSIONS.mobile.adjust);
  }

  if (config.integrations.scate.enabled) {
    Object.assign(dependencies, DEPENDENCY_VERSIONS.mobile.scate);
  }

  if (config.integrations.att.enabled) {
    Object.assign(dependencies, DEPENDENCY_VERSIONS.mobile.att);
  }

  return {
    name: `${config.projectName}-mobile`,
    version: '1.0.0',
    description: `React Native mobile app for ${config.projectName}`,
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
 * Build backend package.json based on configuration
 *
 * NOTE: The actual package.json generation in production happens via EJS templates.
 * This function serves as a programmatic representation for testing and validation.
 */
export function buildBackendPackageJson(config: ProjectConfig): Record<string, unknown> {
  const dependencies: Record<string, string> = {
    ...DEPENDENCY_VERSIONS.backend.core,
  };

  // Add event queue dependencies if enabled
  if (config.backend.eventQueue) {
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

  // Add event queue scripts if enabled
  if (config.backend.eventQueue) {
    scripts['dev:event-queue'] = 'bun --watch ./controllers/event-queue/index.ts | pino-pretty --colorize';
    scripts['start:event-queue'] = 'bun run dist/controllers/event-queue/index.js';
  }

  return {
    name: `${config.projectName}-backend`,
    version: '1.0.0',
    description: `Backend API for ${config.projectName}`,
    type: 'module',
    main: 'controllers/rest-api/index.ts',
    scripts,
    dependencies,
    devDependencies: DEPENDENCY_VERSIONS.devDependencies.backend,
  };
}
