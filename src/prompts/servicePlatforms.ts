import inquirer from 'inquirer';
import type { ServiceConfig } from '../types/index.js';
import { allocateBackendPort, allocateWebPort } from '../utils/port-allocator.js';
import { noIntegrations } from '../config/presets.js';

export interface ServicePlatformAnswers {
  web: boolean;
  mobile: boolean;
  eventQueue: boolean;
  authMiddleware: ServiceConfig['backend']['authMiddleware'];
  roles?: string[];
}

/**
 * Per-service prompts for web / mobile / event queue / auth middleware.
 */
export async function promptServicePlatforms(options: {
  hasAuthService: boolean;
  serviceName: string;
}): Promise<ServicePlatformAnswers> {
  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'platforms',
      message: `Which platforms should "${options.serviceName}" expose?`,
      choices: [
        { name: 'Backend (always included)', value: 'backend', checked: true, disabled: true },
        { name: 'Web frontend (Next.js)', value: 'web' },
        { name: 'Mobile frontend (Expo)', value: 'mobile' },
      ],
    },
    {
      type: 'confirm',
      name: 'eventQueue',
      message: `Enable event queue (BullMQ + Redis) for "${options.serviceName}"?`,
      default: false,
    },
  ]);

  let authMiddleware: ServiceConfig['backend']['authMiddleware'] = 'none';
  let roles: string[] | undefined;

  if (options.hasAuthService) {
    const authAnswer = await inquirer.prompt([
      {
        type: 'list',
        name: 'authMiddleware',
        message: `Which auth middleware flavor for "${options.serviceName}"?`,
        choices: [
          { name: 'Standard (forwards cookies to auth)', value: 'standard' },
          { name: 'Role-gated (standard + requires a role)', value: 'role-gated' },
          { name: 'Flexible (cookie or device session)', value: 'flexible' },
          { name: 'None (no auth on this service)', value: 'none' },
        ],
        default: 'standard',
      },
    ]);
    authMiddleware = authAnswer.authMiddleware;

    if (authMiddleware === 'role-gated') {
      const rolesAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'roles',
          message: 'Comma-separated list of allowed roles:',
          default: 'admin',
          filter: (input: string) =>
            input
              .split(',')
              .map((s) => s.trim())
              .filter((s) => s.length > 0),
        },
      ]);
      roles = rolesAnswer.roles;
    }
  }

  return {
    web: answers.platforms.includes('web'),
    mobile: answers.platforms.includes('mobile'),
    eventQueue: answers.eventQueue,
    authMiddleware,
    roles,
  };
}

/**
 * Build a `ServiceConfig` for a service being added interactively given
 * the other services already in the list (so ports can be allocated).
 */
export function buildServiceFromPlatformAnswers(
  name: string,
  answers: ServicePlatformAnswers,
  existing: readonly ServiceConfig[]
): ServiceConfig {
  const backendPort = allocateBackendPort(existing);
  const webPort = answers.web ? allocateWebPort(existing) : 0;

  return {
    name,
    kind: 'base',
    backend: {
      port: backendPort,
      eventQueue: answers.eventQueue,
      imageUploads: false,
      authMiddleware: answers.authMiddleware,
      ...(answers.roles ? { roles: answers.roles } : {}),
    },
    web: answers.web ? { enabled: true, port: webPort } : null,
    mobile: answers.mobile ? { enabled: true } : null,
    integrations: noIntegrations(),
  };
}
