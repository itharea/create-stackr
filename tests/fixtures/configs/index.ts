import type { InitConfig, ServiceConfig } from '../../../src/types/index.js';
import { minimalConfig } from './minimal.js';
import { fullFeaturedConfig } from './full-featured.js';
import { analyticsFocusedConfig } from './analytics-focused.js';

export { minimalConfig } from './minimal.js';
export { fullFeaturedConfig } from './full-featured.js';
export { analyticsFocusedConfig } from './analytics-focused.js';

type InitBody = Omit<InitConfig, 'projectName' | 'packageManager' | 'appScheme'>;

/**
 * Diverse full configs for tests that generate directly from a fixture.
 * Replaces the old `PRESETS` array — these are test fixtures, not user
 * presets.
 */
export const TEST_CONFIGS = [
  { name: 'Minimal', config: minimalConfig },
  { name: 'Full-Featured', config: fullFeaturedConfig },
  { name: 'Analytics-Focused', config: analyticsFocusedConfig },
] as const;

/** Strip the per-invocation fields so a test can re-run the CLI pipeline. */
function toBody(c: Readonly<InitConfig>): InitBody {
  const { projectName: _p, packageManager: _pm, appScheme: _a, ...body } = c;
  return body;
}

/**
 * The same diverse configs as `InitBody` (no projectName/packageManager/
 * appScheme), for tests that exercise `applyCliOptionsToPreset` — the real
 * CLI path that allocates ports, re-syncs provisioningTargets, and sweeps
 * `--no-tests`.
 */
export const TEST_CONFIG_BODIES = [
  { name: 'Minimal', body: toBody(minimalConfig) },
  { name: 'Full-Featured', body: toBody(fullFeaturedConfig) },
  { name: 'Analytics-Focused', body: toBody(analyticsFocusedConfig) },
] as const;

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
