import inquirer from 'inquirer';
import { promptProjectName } from './project.js';
import { promptPackageManager } from './packageManager.js';
import { promptORM } from './orm.js';
import { promptAITools } from './aiTools.js';
import { promptServices, buildExtraServicesFromFlag } from './services.js';
import { PRESETS, loadPreset, coreEntry, noIntegrations } from '../config/presets.js';
import type {
  InitConfig,
  CLIOptions,
  ServiceConfig,
} from '../types/index.js';
import { deriveAppScheme } from '../types/index.js';

/**
 * Phase 2 prompt orchestrator. Produces a fully populated `InitConfig`.
 *
 * Flow:
 *   --template <preset>  → load preset, skip most prompts
 *   --defaults           → use minimal preset, skip all prompts
 *   interactive          → preset selection or custom loop
 *
 * `--with-services` adds extra base services to whichever preset/custom
 * config came out the other end (per meta_phases.md §1 flag semantics).
 */
export async function collectConfiguration(
  projectName: string | undefined,
  options: CLIOptions
): Promise<InitConfig> {
  const name = await promptProjectName(projectName);

  // Non-interactive paths first.
  if (options.defaults) {
    return applyCliOptionsToPreset(
      loadPreset('minimal'),
      name,
      'npm',
      options
    );
  }

  if (options.template) {
    const base = loadPreset(options.template);
    const aiTools = await promptAITools();
    const packageManager = await promptPackageManager();
    return applyCliOptionsToPreset(
      { ...base, aiTools },
      name,
      packageManager,
      options
    );
  }

  // Interactive: preset or custom
  const { choice } = await inquirer.prompt([
    {
      type: 'list',
      name: 'choice',
      message: 'Choose a starting template:',
      choices: [
        ...PRESETS.map((preset) => ({
          name: `${preset.icon} ${preset.name} - ${preset.description}`,
          value: preset.name.toLowerCase(),
          short: preset.name,
        })),
        { name: '⚙️  Custom - Pick exactly what you need', value: 'custom', short: 'Custom' },
      ],
      pageSize: 10,
    },
  ]);

  let body: Omit<InitConfig, 'projectName' | 'packageManager' | 'appScheme'>;

  if (choice === 'custom') {
    const services = await promptServices();
    const orm = await promptORM();
    const aiTools = await promptAITools();
    body = {
      orm,
      aiTools,
      services,
      preset: 'custom',
      customized: true,
    };
  } else {
    body = { ...loadPreset(choice) };
    // Preset may still get AI tools / package manager collected below.
    const aiTools = await promptAITools();
    body.aiTools = aiTools;
  }

  const packageManager = await promptPackageManager();
  return applyCliOptionsToPreset(body, name, packageManager, options);
}

/**
 * Apply CLI overrides (`--service-name`, `--no-auth`, `--with-services`)
 * to a resolved `InitConfig` body and stamp in the project name + derived
 * app scheme.
 */
export function applyCliOptionsToPreset(
  body: Omit<InitConfig, 'projectName' | 'packageManager' | 'appScheme'>,
  projectName: string,
  packageManager: 'npm' | 'yarn' | 'bun',
  options: CLIOptions
): InitConfig {
  let services: ServiceConfig[] = body.services.map((s) => ({ ...s }));

  // --no-auth: strip the auth service entry and force every remaining
  // service's middleware to 'none'.
  if (options.auth === false) {
    services = services.filter((s) => s.kind !== 'auth');
    services = services.map((s) => ({
      ...s,
      backend: { ...s.backend, authMiddleware: 'none' as const },
    }));
  }

  // --service-name: rename the first base service (or add one if the
  // filtered list is empty).
  if (options.serviceName && options.serviceName.length > 0) {
    const baseIdx = services.findIndex((s) => s.kind === 'base');
    if (baseIdx >= 0) {
      services[baseIdx] = { ...services[baseIdx], name: options.serviceName };
    } else {
      services.push(
        coreEntry({
          name: options.serviceName,
          backend: {
            port: 8080,
            eventQueue: false,
            imageUploads: false,
            authMiddleware: options.auth === false ? 'none' : 'standard',
            tests: true,
          },
        })
      );
    }
  }

  // --with-services: append extra base services.
  if (options.withServices && options.withServices.length > 0) {
    const extras = buildExtraServicesFromFlag(
      options.withServices,
      services,
      options.auth !== false
    );
    services.push(...extras);
  }

  // If auth service is still present, sync its provisioningTargets.
  const authSvc = services.find((s) => s.kind === 'auth');
  if (authSvc && authSvc.authConfig) {
    authSvc.authConfig.provisioningTargets = services
      .filter((s) => s.kind === 'base')
      .map((s) => s.name);
  }

  // Ensure at least one service exists after --no-auth.
  if (services.length === 0) {
    services.push(
      coreEntry({
        name: options.serviceName ?? 'core',
        backend: {
          port: 8080,
          eventQueue: false,
          imageUploads: false,
          authMiddleware: 'none',
          tests: true,
        },
        integrations: noIntegrations(),
      })
    );
  }

  // --no-tests sweep runs LAST so it reaches every service — including ones
  // freshly constructed above via `coreEntry` (for `--service-name`,
  // `--with-services`, or the empty-list fallback).
  if (options.tests === false) {
    services = services.map((s) => ({
      ...s,
      backend: { ...s.backend, tests: false },
    }));
  }

  return {
    ...body,
    services,
    projectName,
    packageManager,
    appScheme: deriveAppScheme(projectName),
    // Runtime-only flag; propagates to `MonorepoGenerator.renderMonorepoRoot`
    // which gates `.github/workflows/test.yml` on it.
    ciWorkflow: Boolean(options.ciWorkflow),
  };
}
