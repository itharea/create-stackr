import type { ProjectConfig } from '../../../src/types/index.js';

export const webMinimalConfig: Readonly<ProjectConfig> = {
  projectName: 'test-web-minimal',
  packageManager: 'npm',
  appScheme: 'testwebminimal',
  platforms: ['web'],
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
      passwordReset: false,
      twoFactor: false,
    },
    paywall: false,
    sessionManagement: false,
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
  aiTools: ['codex'],
} as const;
