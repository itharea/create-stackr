import type { ProjectConfig } from '../../../src/types/index.js';

export const analyticsFocusedConfig: Readonly<ProjectConfig> = {
  projectName: 'test-analytics',
  packageManager: 'npm',
  appScheme: 'testanalytics',
  platforms: ['mobile', 'web'],
  features: {
    onboarding: { enabled: true, pages: 2, skipButton: false, showPaywall: false },
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
    adjust: { enabled: true, appToken: 'test_token', environment: 'sandbox' },
    scate: { enabled: true, apiKey: 'test_api_key' },
    att: { enabled: true },
  },
  backend: {
    database: 'postgresql',
    orm: 'prisma',
    eventQueue: true,
    docker: true,
  },
  preset: 'analytics-focused',
  customized: false,
  aiTools: ['codex'],
} as const;
