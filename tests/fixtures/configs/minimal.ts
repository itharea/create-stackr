import type { ProjectConfig } from '../../../src/types/index.js';

export const minimalConfig: Readonly<ProjectConfig> = {
  projectName: 'test-minimal',
  packageManager: 'npm',
  features: {
    onboarding: { enabled: false, pages: 0, skipButton: false, showPaywall: false },
    authentication: true,
    paywall: false,
    sessionManagement: true,
    tabs: true,
  },
  integrations: {
    revenueCat: { enabled: false, iosKey: '', androidKey: '' },
    adjust: { enabled: false, appToken: '', environment: 'sandbox' },
    scate: { enabled: false, apiKey: '' },
    att: { enabled: false },
  },
  backend: {
    database: 'postgresql',
    eventQueue: false,
    docker: true,
  },
  preset: 'minimal',
  customized: false,
} as const;
