import type {
  AuthServiceConfig,
  InitConfig,
  ServiceConfig,
} from '../types/index.js';
import { AUTH_BACKEND_PORT, AUTH_WEB_PORT } from '../utils/port-allocator.js';

/**
 * Reusable service-entry factories (`authEntry`, `coreEntry`, `noIntegrations`)
 * plus `defaultInitBody()` — the internal config backing the `--defaults`
 * flag. There are no user-facing presets: the interactive flow always asks
 * the user what to build, and `--defaults` is the only non-interactive path.
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

/**
 * Internal default config backing the `--defaults` flag (replaces the old
 * user-facing `minimal` preset). Drizzle ORM, an auth service with the admin
 * dashboard enabled, and one base service named "core".
 */
export function defaultInitBody(): InitBody {
  return {
    orm: 'drizzle',
    aiTools: ['codex'],
    preset: 'default',
    customized: false,
    services: [
      authEntry({
        emailVerification: false,
        passwordReset: true,
        adminDashboard: true,
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
