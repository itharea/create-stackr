import type { ProjectConfig } from '../../../src/types/index.js';

export const webWithOAuthConfig: Readonly<ProjectConfig> = {
  projectName: 'test-web-oauth',
  packageManager: 'npm',
  appScheme: 'testweboauth',
  platforms: ['web'],
  features: {
    onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
    authentication: {
      enabled: true,
      providers: {
        emailPassword: true,
        google: true,
        apple: true,
        github: true,
      },
      emailVerification: true,
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
  preset: 'custom',
  customized: true,
} as const;
