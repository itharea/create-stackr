import type { PresetDefinition } from '../types/index.js';

export const PRESETS: PresetDefinition[] = [
  {
    name: 'Minimal',
    description: 'Basic mobile app + backend',
    icon: '📱',
    config: {
      features: {
        onboarding: {
          enabled: false,
          pages: 0,
          skipButton: false,
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
        revenueCat: {
          enabled: false,
          iosKey: '',
          androidKey: '',
        },
        adjust: {
          enabled: false,
          appToken: '',
          environment: 'sandbox',
        },
        scate: {
          enabled: false,
          apiKey: '',
        },
        att: {
          enabled: false,
        },
      },
      backend: {
        database: 'postgresql',
        eventQueue: false,
        docker: true,
      },
      preset: 'minimal',
      customized: false,
    },
  },
  {
    name: 'Full-Featured',
    description: 'All integrations included',
    icon: '🚀',
    config: {
      features: {
        onboarding: {
          enabled: true,
          pages: 3,
          skipButton: true,
          showPaywall: true,
        },
        authentication: {
          enabled: true,
          providers: {
            emailPassword: true,
            google: true,
            apple: true,
            github: false,
          },
          emailVerification: true,
          passwordReset: true,
          twoFactor: false,
        },
        paywall: true,
        sessionManagement: true,
      },
      integrations: {
        revenueCat: {
          enabled: true,
          iosKey: 'YOUR_IOS_API_KEY_HERE',
          androidKey: 'YOUR_ANDROID_API_KEY_HERE',
        },
        adjust: {
          enabled: true,
          appToken: 'YOUR_ADJUST_APP_TOKEN_HERE',
          environment: 'sandbox',
        },
        scate: {
          enabled: true,
          apiKey: 'YOUR_SCATE_API_KEY_HERE',
        },
        att: {
          enabled: true,
        },
      },
      backend: {
        database: 'postgresql',
        eventQueue: true,
        docker: true,
      },
      preset: 'full-featured',
      customized: false,
    },
  },
  {
    name: 'Analytics-Focused',
    description: 'Adjust + Scate + basic features',
    icon: '📊',
    config: {
      features: {
        onboarding: {
          enabled: true,
          pages: 2,
          skipButton: false,
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
        revenueCat: {
          enabled: false,
          iosKey: '',
          androidKey: '',
        },
        adjust: {
          enabled: true,
          appToken: 'YOUR_ADJUST_APP_TOKEN_HERE',
          environment: 'sandbox',
        },
        scate: {
          enabled: true,
          apiKey: 'YOUR_SCATE_API_KEY_HERE',
        },
        att: {
          enabled: true,
        },
      },
      backend: {
        database: 'postgresql',
        eventQueue: true,
        docker: true,
      },
      preset: 'analytics-focused',
      customized: false,
    },
  },
];
