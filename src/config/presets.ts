import type {
  AuthServiceConfig,
  InitConfig,
  PresetDefinition,
  ServiceConfig,
} from '../types/index.js';
import { AUTH_BACKEND_PORT, AUTH_WEB_PORT } from '../utils/port-allocator.js';

/**
 * Phase 2 presets are now `InitConfig` factories that produce a
 * `services[]` array instead of the single flat feature set of v0.4.
 * See `plans/phase2_multi_service_generation.md` §E5.
 *
 * Presets are not customizable interactively in v0.5 — picking `minimal`
 * applies the preset as-is; users who want tweaks either pick `custom` or
 * run `stackr add service` afterward.
 */

type InitBody = Omit<InitConfig, 'projectName' | 'packageManager' | 'appScheme'>;

/** Factory: a standard auth service entry. */
export function authEntry(
  options: Partial<AuthServiceConfig> & { adminDashboard?: boolean } = {}
): ServiceConfig {
  const providers = {
    emailPassword: true,
    google: options.providers?.google ?? false,
    apple: options.providers?.apple ?? false,
    github: options.providers?.github ?? false,
  };

  const authConfig: AuthServiceConfig = {
    providers,
    emailVerification: options.emailVerification ?? false,
    passwordReset: options.passwordReset ?? true,
    twoFactor: options.twoFactor ?? false,
    adminDashboard: options.adminDashboard ?? false,
    additionalUserFields: options.additionalUserFields ?? [],
    provisioningTargets: options.provisioningTargets ?? [],
  };

  const adminDashboard = authConfig.adminDashboard;

  return {
    name: 'auth',
    kind: 'auth',
    backend: {
      port: AUTH_BACKEND_PORT,
      eventQueue: false,
      imageUploads: false,
      authMiddleware: 'standard',
      tests: true,
    },
    web: adminDashboard ? { enabled: true, port: AUTH_WEB_PORT } : null,
    mobile: null,
    authConfig,
    integrations: noIntegrations(),
  };
}

/** Factory: a minimal base service. */
export function coreEntry(options: Partial<ServiceConfig> = {}): ServiceConfig {
  return {
    name: options.name ?? 'core',
    kind: 'base',
    backend: {
      port: options.backend?.port ?? 8080,
      eventQueue: options.backend?.eventQueue ?? false,
      imageUploads: options.backend?.imageUploads ?? false,
      authMiddleware: options.backend?.authMiddleware ?? 'standard',
      tests: options.backend?.tests ?? true,
    },
    web: options.web ?? null,
    mobile: options.mobile ?? null,
    integrations: options.integrations ?? noIntegrations(),
  };
}

export function noIntegrations(): ServiceConfig['integrations'] {
  return {
    revenueCat: { enabled: false, iosKey: '', androidKey: '' },
    adjust: { enabled: false, appToken: '', environment: 'sandbox' },
    scate: { enabled: false, apiKey: '' },
    att: { enabled: false },
  };
}

function minimal(): InitBody {
  return {
    orm: 'prisma',
    aiTools: ['codex'],
    preset: 'minimal',
    customized: false,
    services: [
      authEntry({
        emailVerification: false,
        passwordReset: true,
        adminDashboard: false,
        provisioningTargets: ['core'],
      }),
      coreEntry({
        name: 'core',
        backend: {
          port: 8080,
          eventQueue: false,
          imageUploads: false,
          authMiddleware: 'standard',
          tests: true,
        },
        web: null,
        mobile: null,
      }),
    ],
  };
}

function fullFeatured(): InitBody {
  const integrations: ServiceConfig['integrations'] = {
    revenueCat: { enabled: true, iosKey: 'YOUR_IOS_API_KEY_HERE', androidKey: 'YOUR_ANDROID_API_KEY_HERE' },
    adjust: { enabled: true, appToken: 'YOUR_ADJUST_APP_TOKEN_HERE', environment: 'sandbox' },
    scate: { enabled: true, apiKey: 'YOUR_SCATE_API_KEY_HERE' },
    att: { enabled: true },
  };

  return {
    orm: 'prisma',
    aiTools: ['codex'],
    preset: 'full-featured',
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
}

function analyticsFocused(): InitBody {
  const integrations: ServiceConfig['integrations'] = {
    revenueCat: { enabled: false, iosKey: '', androidKey: '' },
    adjust: { enabled: true, appToken: 'YOUR_ADJUST_APP_TOKEN_HERE', environment: 'sandbox' },
    scate: { enabled: true, apiKey: 'YOUR_SCATE_API_KEY_HERE' },
    att: { enabled: true },
  };

  return {
    orm: 'prisma',
    aiTools: ['codex'],
    preset: 'analytics-focused',
    customized: false,
    services: [
      authEntry({
        emailVerification: false,
        passwordReset: true,
        adminDashboard: false,
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
}

export const PRESETS: PresetDefinition[] = [
  {
    name: 'Minimal',
    description: 'Auth service + one base service',
    icon: '📱',
    config: minimal(),
  },
  {
    name: 'Full-Featured',
    description: 'Auth + core with web/mobile/eventQueue and integrations',
    icon: '🚀',
    config: fullFeatured(),
  },
  {
    name: 'Analytics-Focused',
    description: 'Auth + core with Adjust + Scate analytics',
    icon: '📊',
    config: analyticsFocused(),
  },
];

/**
 * Helper: look up a preset by case-insensitive name and return the body
 * ready to merge with per-invocation fields.
 */
export function loadPreset(name: string): InitBody {
  const preset = PRESETS.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!preset) {
    const available = PRESETS.map((p) => p.name.toLowerCase()).join(', ');
    throw new Error(`Unknown preset: ${name}. Available: ${available}`);
  }
  return preset.config;
}
