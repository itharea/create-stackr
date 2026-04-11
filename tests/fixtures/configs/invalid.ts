import type { InitConfig } from '../../../src/types/index.js';
import { deriveAppScheme } from '../../../src/types/index.js';
import { authEntry, coreEntry, noIntegrations } from '../../../src/config/presets.js';
import { cloneInitConfig } from './index.js';
import { minimalConfig } from './minimal.js';

/**
 * Bank of invalid `InitConfig` fixtures. Each entry has an `expectedError`
 * substring that the validator's error message must contain.
 *
 * Consumed by `validate-fixtures.test.ts` and `config-conflicts.test.ts`.
 */
export interface InvalidCase {
  name: string;
  config: InitConfig;
  expectedError: string;
}

function duplicateServiceNames(): InitConfig {
  const base = cloneInitConfig(minimalConfig);
  base.services = [
    authEntry({ provisioningTargets: ['core'] }),
    coreEntry({
      name: 'core',
      backend: {
        port: 8080,
        eventQueue: false,
        imageUploads: false,
        authMiddleware: 'standard',
      },
      integrations: noIntegrations(),
    }),
    coreEntry({
      name: 'core',
      backend: {
        port: 8081,
        eventQueue: false,
        imageUploads: false,
        authMiddleware: 'standard',
      },
      integrations: noIntegrations(),
    }),
  ];
  base.projectName = 'test-duplicate-names';
  base.appScheme = deriveAppScheme(base.projectName);
  return base;
}

function duplicateBackendPorts(): InitConfig {
  const base = cloneInitConfig(minimalConfig);
  base.services = [
    authEntry({ provisioningTargets: ['core', 'admin'] }),
    coreEntry({
      name: 'core',
      backend: {
        port: 8080,
        eventQueue: false,
        imageUploads: false,
        authMiddleware: 'standard',
      },
      integrations: noIntegrations(),
    }),
    coreEntry({
      name: 'admin',
      backend: {
        port: 8080,
        eventQueue: false,
        imageUploads: false,
        authMiddleware: 'standard',
      },
      integrations: noIntegrations(),
    }),
  ];
  base.projectName = 'test-duplicate-ports';
  base.appScheme = deriveAppScheme(base.projectName);
  return base;
}

function duplicateWebPorts(): InitConfig {
  const base = cloneInitConfig(minimalConfig);
  base.services = [
    authEntry({ provisioningTargets: ['core', 'admin'] }),
    coreEntry({
      name: 'core',
      backend: {
        port: 8080,
        eventQueue: false,
        imageUploads: false,
        authMiddleware: 'standard',
      },
      web: { enabled: true, port: 3000 },
      integrations: noIntegrations(),
    }),
    coreEntry({
      name: 'admin',
      backend: {
        port: 8081,
        eventQueue: false,
        imageUploads: false,
        authMiddleware: 'standard',
      },
      web: { enabled: true, port: 3000 },
      integrations: noIntegrations(),
    }),
  ];
  base.projectName = 'test-duplicate-web-ports';
  base.appScheme = deriveAppScheme(base.projectName);
  return base;
}

function badServiceName(): InitConfig {
  const base = cloneInitConfig(minimalConfig);
  base.services = [
    authEntry({ provisioningTargets: ['Bad_Name'] }),
    coreEntry({
      name: 'Bad_Name',
      backend: {
        port: 8080,
        eventQueue: false,
        imageUploads: false,
        authMiddleware: 'standard',
      },
      integrations: noIntegrations(),
    }),
  ];
  base.projectName = 'test-bad-service-name';
  base.appScheme = deriveAppScheme(base.projectName);
  return base;
}

function roleGatedWithoutRoles(): InitConfig {
  const base = cloneInitConfig(minimalConfig);
  base.services = [
    authEntry({ provisioningTargets: ['core'] }),
    coreEntry({
      name: 'core',
      backend: {
        port: 8080,
        eventQueue: false,
        imageUploads: false,
        authMiddleware: 'role-gated',
        // roles intentionally omitted
      },
      integrations: noIntegrations(),
    }),
  ];
  base.projectName = 'test-role-gated';
  base.appScheme = deriveAppScheme(base.projectName);
  return base;
}

function authMiddlewareInNoAuthMonorepo(): InitConfig {
  const base = cloneInitConfig(minimalConfig);
  base.services = [
    coreEntry({
      name: 'core',
      backend: {
        port: 8080,
        eventQueue: false,
        imageUploads: false,
        authMiddleware: 'standard',
      },
      integrations: noIntegrations(),
    }),
  ];
  base.projectName = 'test-no-auth-but-middleware';
  base.appScheme = deriveAppScheme(base.projectName);
  return base;
}

export const invalidCases: Readonly<Record<string, InvalidCase>> = {
  duplicateServiceNames: {
    name: 'duplicate service names',
    config: duplicateServiceNames(),
    expectedError: 'Duplicate service name',
  },
  duplicateBackendPorts: {
    name: 'duplicate backend ports',
    config: duplicateBackendPorts(),
    expectedError: 'Duplicate backend port',
  },
  duplicateWebPorts: {
    name: 'duplicate web ports',
    config: duplicateWebPorts(),
    expectedError: 'Duplicate web port',
  },
  badServiceName: {
    name: 'bad service name',
    config: badServiceName(),
    expectedError: 'lowercase alphanumeric',
  },
  roleGatedWithoutRoles: {
    name: 'role-gated without roles',
    config: roleGatedWithoutRoles(),
    expectedError: 'no roles configured',
  },
  authMiddlewareInNoAuthMonorepo: {
    name: 'authMiddleware in no-auth monorepo',
    config: authMiddlewareInNoAuthMonorepo(),
    expectedError: 'no auth service is present',
  },
};
