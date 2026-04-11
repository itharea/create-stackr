import type {
  AITool,
  InitConfig,
  ServiceConfig,
  ServiceRenderContext,
  LegacyFeaturesShim,
  LegacyBackendShim,
} from '../types/index.js';
import { noIntegrations } from '../config/presets.js';
import type { ServiceEntry, StackrConfigFile } from '../types/config-file.js';
import { readStackrVersion } from '../utils/version.js';

/**
 * Build the `ServiceRenderContext` passed to every EJS file inside a single
 * service subtree. Derives auth-service awareness (`hasAuthService`,
 * `authServiceUrl`, `provisioningTargets`, etc.) from the full `initConfig`
 * and populates the legacy shim fields (`platforms`, `features`, `backend`,
 * `integrations`) so pre-phase-2 EJS templates continue to render without
 * rewriting.
 */
export function buildServiceContext(
  initConfig: InitConfig,
  service: ServiceConfig
): ServiceRenderContext {
  const authService = initConfig.services.find((s) => s.kind === 'auth') ?? null;
  const hasAuthService = authService !== null;

  const peerServices = initConfig.services.filter((s) => s.name !== service.name);
  const peerServiceNames = peerServices.map((s) => s.name);
  const peerWebPorts = peerServices
    .filter((s) => s.web?.enabled)
    .map((s) => (s.web as { enabled: boolean; port: number }).port);

  // Auth services own their own provisioning targets — for non-auth
  // services we expose an empty list (they don't provision anything).
  const provisioningTargets =
    service.kind === 'auth'
      ? service.authConfig?.provisioningTargets ??
        // Derive from peer non-auth services if the authConfig didn't set it
        initConfig.services.filter((s) => s.kind === 'base').map((s) => s.name)
      : [];

  const authServiceName = hasAuthService ? (authService as ServiceConfig).name : null;
  const authServicePort = hasAuthService ? (authService as ServiceConfig).backend.port : null;
  const authServiceUrl = hasAuthService
    ? `http://${authServiceName}_rest_api:${authServicePort}`
    : null;

  const platforms: ('mobile' | 'web')[] = [];
  if (service.mobile?.enabled) platforms.push('mobile');
  if (service.web?.enabled) platforms.push('web');

  const features = deriveLegacyFeatures(service, authService);
  const backend = deriveLegacyBackend(service, initConfig);

  return {
    projectName: initConfig.projectName,
    packageManager: initConfig.packageManager,
    orm: initConfig.orm,
    appScheme: initConfig.appScheme,
    aiTools: initConfig.aiTools,

    hasAuthService,
    authServiceName,
    authServicePort,
    authServiceUrl,
    provisioningTargets,
    peerWebPorts,
    peerServiceNames,

    service,

    // Shim fields (for templates that haven't been rewritten yet)
    platforms,
    features,
    integrations: service.integrations,
    backend,
  };
}

/**
 * Derive the shim `LegacyFeaturesShim` from a service + the monorepo's auth
 * service. This populates `features.authentication` from the auth service's
 * own config (if any) — phase-1 EJS files that read
 * `features.authentication.twoFactor` continue to work by reading the
 * auth-service toggles.
 */
function deriveLegacyFeatures(
  service: ServiceConfig,
  authService: ServiceConfig | null
): LegacyFeaturesShim {
  const authEnabled = authService !== null && service.backend.authMiddleware !== 'none';
  const authConf = authService?.authConfig;

  return {
    onboarding: {
      // Onboarding is mobile-only today and not first-class in ServiceConfig
      // yet — derive a safe default. Phase-3 may promote this to a service
      // flag if needed.
      enabled: false,
      pages: 0,
      skipButton: false,
      showPaywall: false,
    },
    authentication: {
      enabled: authEnabled,
      providers: authConf?.providers ?? {
        emailPassword: true,
        google: false,
        apple: false,
        github: false,
      },
      emailVerification: authConf?.emailVerification ?? false,
      passwordReset: authConf?.passwordReset ?? false,
      twoFactor: authConf?.twoFactor ?? false,
    },
    paywall: service.integrations.revenueCat.enabled,
    sessionManagement: true,
  };
}

function deriveLegacyBackend(service: ServiceConfig, initConfig: InitConfig): LegacyBackendShim {
  return {
    database: 'postgresql',
    orm: initConfig.orm,
    eventQueue: service.backend.eventQueue,
    docker: true,
  };
}

/**
 * Build the on-disk `StackrConfigFile` from an in-memory `InitConfig`.
 * Strips API keys from integrations so the serialized form only carries
 * `{ enabled }` flags — secrets never land in git.
 */
export function buildStackrConfig(initConfig: InitConfig): StackrConfigFile {
  const now = new Date().toISOString();
  const stackrVersion = readStackrVersion();

  const services: ServiceEntry[] = initConfig.services.map((svc) =>
    buildServiceEntry(svc, now, stackrVersion)
  );

  return {
    version: 1,
    stackrVersion,
    projectName: initConfig.projectName,
    createdAt: now,
    packageManager: initConfig.packageManager,
    orm: initConfig.orm,
    aiTools: initConfig.aiTools,
    appScheme: initConfig.appScheme,
    services,
  };
}

/**
 * Reverse of `buildStackrConfig`. Lifts a `StackrConfigFile` loaded from
 * disk back into an `InitConfig`-shaped runtime value so generators and
 * `buildServiceContext` can work against a project that was created in
 * a prior invocation (e.g. from `stackr add service`). Integration API
 * keys are NOT in `stackr.config.json` — they're always runtime-only —
 * so the returned `integrations` block uses empty-key defaults.
 */
export function stackrConfigToInitConfig(cfg: StackrConfigFile): InitConfig {
  const services: ServiceConfig[] = cfg.services.map((entry) => serviceEntryToServiceConfig(entry));

  return {
    projectName: cfg.projectName,
    packageManager: cfg.packageManager,
    orm: cfg.orm,
    appScheme: cfg.appScheme,
    aiTools: cfg.aiTools as AITool[],
    services,
    // `preset` / `customized` aren't persisted in stackr.config.json and
    // don't matter for post-init rendering — mark as customized so any
    // fallback branching treats the runtime value as hand-authored.
    customized: true,
  };
}

function serviceEntryToServiceConfig(entry: ServiceEntry): ServiceConfig {
  const svc: ServiceConfig = {
    name: entry.name,
    kind: entry.kind,
    backend: {
      port: entry.backend.port,
      eventQueue: entry.backend.eventQueue,
      imageUploads: entry.backend.imageUploads,
      authMiddleware: entry.backend.authMiddleware,
      ...(entry.backend.roles ? { roles: [...entry.backend.roles] } : {}),
    },
    web: entry.web ? { ...entry.web } : null,
    mobile: entry.mobile ? { ...entry.mobile } : null,
    // Integration secrets never live in stackr.config.json. Rehydrate with
    // an empty-keys template so templates that read these fields render
    // placeholder values rather than crashing. Real values come from the
    // user's .env files at runtime.
    integrations: noIntegrations(),
  };

  if (entry.kind === 'auth' && entry.authConfig) {
    svc.authConfig = {
      providers: { ...entry.authConfig.providers },
      emailVerification: entry.authConfig.emailVerification,
      passwordReset: entry.authConfig.passwordReset,
      twoFactor: entry.authConfig.twoFactor,
      adminDashboard: entry.authConfig.adminDashboard,
      additionalUserFields: entry.authConfig.additionalUserFields.map((f) => ({ ...f })),
      provisioningTargets: [...entry.authConfig.provisioningTargets],
    };
  }

  return svc;
}

function buildServiceEntry(
  svc: ServiceConfig,
  now: string,
  stackrVersion: string
): ServiceEntry {
  const entry: ServiceEntry = {
    name: svc.name,
    kind: svc.kind,
    backend: {
      port: svc.backend.port,
      eventQueue: svc.backend.eventQueue,
      imageUploads: svc.backend.imageUploads,
      authMiddleware: svc.backend.authMiddleware,
      ...(svc.backend.roles ? { roles: svc.backend.roles } : {}),
    },
    web: svc.web,
    mobile: svc.mobile,
    integrations: {
      revenueCat: { enabled: svc.integrations.revenueCat.enabled },
      adjust: { enabled: svc.integrations.adjust.enabled },
      scate: { enabled: svc.integrations.scate.enabled },
      att: { enabled: svc.integrations.att.enabled },
    },
    generatedAt: now,
    generatedBy: stackrVersion,
  };

  if (svc.kind === 'auth' && svc.authConfig) {
    entry.authConfig = {
      providers: svc.authConfig.providers,
      emailVerification: svc.authConfig.emailVerification,
      passwordReset: svc.authConfig.passwordReset,
      twoFactor: svc.authConfig.twoFactor,
      adminDashboard: svc.authConfig.adminDashboard,
      additionalUserFields: svc.authConfig.additionalUserFields,
      provisioningTargets: svc.authConfig.provisioningTargets,
    };
  }

  return entry;
}
