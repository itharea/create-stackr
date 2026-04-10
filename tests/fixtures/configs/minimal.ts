import type { InitConfig } from '../../../src/types/index.js';
import { authEntry, coreEntry, noIntegrations } from '../../../src/config/presets.js';

/**
 * Minimal InitConfig fixture for phase 2 tests. Equivalent to what
 * `create-stackr myapp --defaults` produces: one auth service + one
 * base service named "core", no web/mobile, prisma, npm.
 */
export const minimalConfig: Readonly<InitConfig> = {
  projectName: 'test-minimal',
  packageManager: 'npm',
  appScheme: 'testminimal',
  orm: 'prisma',
  aiTools: ['codex'],
  preset: 'minimal',
  customized: false,
  services: [
    authEntry({
      emailVerification: false,
      passwordReset: true,
      adminDashboard: false,
      provisioningTargets: ['core'],
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
  ],
};
