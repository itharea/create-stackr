import type { ProjectConfig } from '../../../src/types/index.js';

export const fullFeaturedConfig: Readonly<ProjectConfig> = {
  projectName: 'test-full',
  packageManager: 'npm',
  features: {
    onboarding: { enabled: true, pages: 3, skipButton: true, showPaywall: true },
    authentication: true,
    paywall: true,
    sessionManagement: true,
  },
  integrations: {
    revenueCat: { enabled: true, iosKey: 'test_ios_key', androidKey: 'test_android_key' },
    adjust: { enabled: true, appToken: 'test_token', environment: 'sandbox' },
    scate: { enabled: true, apiKey: 'test_api_key' },
    att: { enabled: true },
  },
  backend: {
    database: 'postgresql',
    eventQueue: true,
    docker: true,
  },
  preset: 'full-featured',
  customized: false,
} as const;
