import type { ProjectConfig } from '../../../src/types/index.js';

export const drizzleConfig: Omit<ProjectConfig, 'projectName' | 'packageManager' | 'appScheme'> = {
  platforms: ['mobile', 'web'],
  features: {
    onboarding: {
      enabled: true,
      pages: 3,
      skipButton: true,
      showPaywall: false,
    },
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
    orm: 'drizzle',
    eventQueue: true,
    docker: true,
  },
  preset: 'custom',
  customized: false,
  aiTools: ['codex'],
};
