import type { InitConfig } from '../../../src/types/index.js';
import { deriveAppScheme } from '../../../src/types/index.js';
import { authEntry, coreEntry, noIntegrations } from '../../../src/config/presets.js';

/**
 * Four-service InitConfig fixture: auth + core + scout + manage.
 * Exercises multi-service port allocation and provisioningTargets wiring.
 */
const projectName = 'test-multi-service';

export const multiServiceConfig: Readonly<InitConfig> = {
  projectName,
  packageManager: 'npm',
  appScheme: deriveAppScheme(projectName),
  orm: 'prisma',
  aiTools: ['codex'],
  preset: 'custom',
  customized: true,
  services: [
    authEntry({
      emailVerification: false,
      passwordReset: true,
      adminDashboard: false,
      provisioningTargets: ['core', 'scout', 'manage'],
    }),
    coreEntry({
      name: 'core',
      backend: {
        port: 8080,
        eventQueue: false,
        imageUploads: false,
        authMiddleware: 'standard',
      },
      web: null,
      mobile: null,
      integrations: noIntegrations(),
    }),
    coreEntry({
      name: 'scout',
      backend: {
        port: 8083,
        eventQueue: true,
        imageUploads: false,
        authMiddleware: 'flexible',
      },
      web: null,
      mobile: { enabled: true },
      integrations: noIntegrations(),
    }),
    coreEntry({
      name: 'manage',
      backend: {
        port: 8084,
        eventQueue: false,
        imageUploads: false,
        authMiddleware: 'flexible',
      },
      web: { enabled: true, port: 3001 },
      mobile: null,
      integrations: noIntegrations(),
    }),
  ],
};
