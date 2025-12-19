import type { ProjectConfig } from '../../../src/types/index.js';

export const mobileOnlyConfig: Readonly<ProjectConfig> = {
  projectName: 'test-mobile-only',
  packageManager: 'npm',
  appScheme: 'testmobileonly',
  platforms: ['mobile'],
  features: {
    onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
    authentication: {
      enabled: true,
      providers: {
        emailPassword: true,
        google: false,
        apple: false,
        github: false,
      },
      emailVerification: false,
      passwordReset: true,
      twoFactor: false,
    },
    paywall: false,
    sessionManagement: true,
  },
  integrations: {
    revenueCat: { enabled: false, iosKey: '', androidKey: '' },
    adjust: { enabled: false, appToken: '', environment: 'sandbox' },
    scate: { enabled: false, apiKey: '' },
    att: { enabled: false },
  },
  backend: {
    database: 'postgresql',
    orm: 'prisma',
    eventQueue: false,
    docker: true,
  },
  preset: 'minimal',
  customized: false,
} as const;
