import inquirer from 'inquirer';
import type { ServiceConfig } from '../types/index.js';
import { validateServiceName } from '../utils/validation.js';
import { authEntry, coreEntry } from '../config/presets.js';
import { promptAuthServiceConfig } from './authService.js';
import { promptServicePlatforms, buildServiceFromPlatformAnswers } from './servicePlatforms.js';
import { allocateBackendPort } from '../utils/port-allocator.js';

/**
 * Drives the multi-service init loop:
 * 1. Enable auth service? (default yes) → dispatch to authService prompts
 * 2. Initial base service name (default "core")
 * 3. Per-service platforms / features / auth flavor
 * 4. "Add another service?" loop
 *
 * Returns the fully populated `services[]` array ready to drop into an
 * `InitConfig`.
 */
export async function promptServices(): Promise<ServiceConfig[]> {
  const { enableAuth } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'enableAuth',
      message: 'Include a dedicated auth service?',
      default: true,
    },
  ]);

  const services: ServiceConfig[] = [];

  if (enableAuth) {
    const authConf = await promptAuthServiceConfig();
    const auth = authEntry({ ...authConf });
    services.push(auth);
  }

  // First base service
  const firstBaseName = await promptBaseServiceName('core', services);
  const firstPlatforms = await promptServicePlatforms({
    hasAuthService: enableAuth,
    serviceName: firstBaseName,
  });
  services.push(
    buildServiceFromPlatformAnswers(firstBaseName, firstPlatforms, services)
  );

  // "Add another?" loop
  while (true) {
    const { addAnother } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'addAnother',
        message: 'Add another base service?',
        default: false,
      },
    ]);

    if (!addAnother) break;

    const nextName = await promptBaseServiceName(
      suggestNextName(services),
      services
    );
    const nextPlatforms = await promptServicePlatforms({
      hasAuthService: enableAuth,
      serviceName: nextName,
    });
    services.push(
      buildServiceFromPlatformAnswers(nextName, nextPlatforms, services)
    );
  }

  // Populate provisioningTargets on auth from final peer list
  const authSvc = services.find((s) => s.kind === 'auth');
  if (authSvc && authSvc.authConfig) {
    authSvc.authConfig.provisioningTargets = services
      .filter((s) => s.kind === 'base')
      .map((s) => s.name);
  }

  return services;
}

async function promptBaseServiceName(
  defaultName: string,
  existing: readonly ServiceConfig[]
): Promise<string> {
  const { name } = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Service name:',
      default: defaultName,
      validate: (input: string) => {
        const r = validateServiceName(input);
        if (!r.valid) return r.error ?? 'Invalid service name';
        if (existing.some((s) => s.name === input)) {
          return `Service "${input}" already exists`;
        }
        return true;
      },
    },
  ]);
  return name;
}

function suggestNextName(existing: readonly ServiceConfig[]): string {
  let n = 2;
  while (existing.some((s) => s.name === `svc${n}`)) n++;
  return `svc${n}`;
}

/**
 * Helper for the non-interactive `--with-services` CLI flag: turns a
 * comma-separated list of service names into `ServiceConfig` entries with
 * locked defaults (backend only, no event queue, standard auth
 * middleware when auth present, otherwise none). Ports are allocated in
 * order relative to `existing`.
 */
export function buildExtraServicesFromFlag(
  namesCsv: string,
  existing: ServiceConfig[],
  hasAuthService: boolean
): ServiceConfig[] {
  const names = namesCsv
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n.length > 0);

  const out: ServiceConfig[] = [];

  for (const name of names) {
    const nameValidation = validateServiceName(name);
    if (!nameValidation.valid) {
      throw new Error(
        `--with-services: invalid name "${name}": ${nameValidation.error ?? 'unknown error'}`
      );
    }
    if ([...existing, ...out].some((s) => s.name === name)) {
      throw new Error(`--with-services: duplicate service name "${name}"`);
    }

    const ghost = [...existing, ...out];
    out.push(
      coreEntry({
        name,
        backend: {
          port: allocateBackendPort(ghost),
          eventQueue: false,
          imageUploads: false,
          authMiddleware: hasAuthService ? 'standard' : 'none',
        },
        web: null,
        mobile: null,
      })
    );
  }

  return out;
}
