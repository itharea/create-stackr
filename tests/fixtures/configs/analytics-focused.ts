import type { InitConfig, ServiceConfig } from '../../../src/types/index.js';
import { deriveAppScheme } from '../../../src/types/index.js';
import { authEntry, coreEntry } from '../../../src/config/presets.js';

/**
 * Analytics-focused InitConfig fixture: a basic auth service + a core service
 * with web/mobile/eventQueue and Adjust + Scate + ATT enabled (RevenueCat
 * off). Built directly from the service-entry factories. Not a user-facing
 * preset; just a diverse config for tests.
 */
const projectName = 'test-analytics-focused';

const integrations: ServiceConfig['integrations'] = {
  revenueCat: { enabled: false, iosKey: '', androidKey: '' },
  adjust: { enabled: true, appToken: 'YOUR_ADJUST_APP_TOKEN_HERE', environment: 'sandbox' },
  scate: { enabled: true, apiKey: 'YOUR_SCATE_API_KEY_HERE' },
  att: { enabled: true },
};

export const analyticsFocusedConfig: Readonly<InitConfig> = {
  projectName,
  packageManager: 'npm',
  appScheme: deriveAppScheme(projectName),
  orm: 'prisma',
  aiTools: ['codex'],
  preset: 'custom',
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
        eventQueue: true,
        imageUploads: false,
        authMiddleware: 'standard',
        tests: true,
      },
      web: { enabled: true, port: 3000 },
      mobile: { enabled: true },
      integrations,
    }),
  ],
};
