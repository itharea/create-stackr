import type { ProjectConfig } from '../../../src/types/index.js';

export const analyticsFocusedConfig: Readonly<ProjectConfig> = {
  projectName: 'test-analytics',
  packageManager: 'npm',
  features: {
    onboarding: { enabled: true, pages: 2, skipButton: false, showPaywall: false },
    authentication: true,
    paywall: false,
    sessionManagement: true,
    tabs: true,
  },
  integrations: {
    revenueCat: { enabled: false, iosKey: '', androidKey: '' },
    adjust: { enabled: true, appToken: 'test_token', environment: 'sandbox' },
    scate: { enabled: true, apiKey: 'test_api_key' },
    att: { enabled: true },
  },
  backend: {
    database: 'postgresql',
    eventQueue: true,
    docker: true,
  },
  preset: 'analytics-focused',
  customized: false,
} as const;
