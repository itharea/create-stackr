import type { InitConfig, ServiceConfig } from '../../../src/types/index.js';
import { deriveAppScheme } from '../../../src/types/index.js';
import { authEntry, coreEntry } from '../../../src/config/presets.js';

/**
 * Full-featured InitConfig fixture: auth (Google/Apple, email verification,
 * admin dashboard) + a core service with web/mobile/eventQueue and every
 * integration enabled. Built directly from the service-entry factories — it
 * exercises the richest generation path in the test suite. Not a user-facing
 * preset; just a diverse config for tests.
 */
const projectName = 'test-full-featured';

const integrations: ServiceConfig['integrations'] = {
  revenueCat: { enabled: true, iosKey: 'YOUR_IOS_API_KEY_HERE', androidKey: 'YOUR_ANDROID_API_KEY_HERE' },
  adjust: { enabled: true, appToken: 'YOUR_ADJUST_APP_TOKEN_HERE', environment: 'sandbox' },
  scate: { enabled: true, apiKey: 'YOUR_SCATE_API_KEY_HERE' },
  att: { enabled: true },
};

export const fullFeaturedConfig: Readonly<InitConfig> = {
  projectName,
  packageManager: 'npm',
  appScheme: deriveAppScheme(projectName),
  orm: 'prisma',
  aiTools: ['codex'],
  preset: 'custom',
  customized: false,
  services: [
    authEntry({
      providers: {
        emailPassword: true,
        google: true,
        apple: true,
        github: false,
      },
      emailVerification: true,
      passwordReset: true,
      twoFactor: false,
      adminDashboard: true,
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
