import type { InitConfig, ServiceConfig } from '../../../src/types/index.js';

export { minimalConfig } from './minimal.js';

/**
 * Deep-clone a fixture so tests can mutate it without polluting siblings.
 */
export function cloneInitConfig(cfg: InitConfig): InitConfig {
  return {
    ...cfg,
    aiTools: [...cfg.aiTools],
    services: cfg.services.map((s) => cloneService(s)),
  };
}

export function cloneService(svc: ServiceConfig): ServiceConfig {
  return {
    ...svc,
    backend: { ...svc.backend, ...(svc.backend.roles ? { roles: [...svc.backend.roles] } : {}) },
    web: svc.web ? { ...svc.web } : null,
    mobile: svc.mobile ? { ...svc.mobile } : null,
    authConfig: svc.authConfig
      ? {
          ...svc.authConfig,
          providers: { ...svc.authConfig.providers },
          additionalUserFields: [...svc.authConfig.additionalUserFields],
          provisioningTargets: [...svc.authConfig.provisioningTargets],
        }
      : undefined,
    integrations: {
      revenueCat: { ...svc.integrations.revenueCat },
      adjust: { ...svc.integrations.adjust },
      scate: { ...svc.integrations.scate },
      att: { ...svc.integrations.att },
    },
  };
}
