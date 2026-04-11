import validateNpmPackageName from 'validate-npm-package-name';
import type { InitConfig, ServiceConfig } from '../types/index.js';

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** Reserved directory segments / OS-reserved names that must never be service names. */
const RESERVED_SERVICE_NAMES = new Set([
  'node_modules',
  'src',
  'dist',
  'build',
  'scripts',
  'plans',
  'docs',
  'test',
  'tests',
  '.git',
  '.github',
  // Windows reserved
  'con',
  'prn',
  'aux',
  'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9',
]);

export function validateProjectName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return {
      valid: false,
      error: 'Project name cannot be empty',
    };
  }

  const npmValidation = validateNpmPackageName(name);
  if (!npmValidation.validForNewPackages) {
    const errors = [
      ...(npmValidation.errors || []),
      ...(npmValidation.warnings || []),
    ];
    return {
      valid: false,
      error: errors.join(', '),
    };
  }

  return { valid: true };
}

/**
 * Validate a service name. Must be a valid directory segment:
 * lowercase alphanumeric + dashes, non-empty, no path separators, no
 * leading dots, not an OS-reserved name. The literal `auth` is reserved
 * for the auth service — `allowAuth` lets the auth entry through.
 */
export function validateServiceName(
  name: string,
  options: { allowAuth?: boolean } = {}
): ValidationResult {
  if (!name || name.length === 0) {
    return { valid: false, error: 'Service name cannot be empty' };
  }

  if (name.length > 40) {
    return { valid: false, error: 'Service name must be 40 characters or fewer' };
  }

  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    return {
      valid: false,
      error: `Service name "${name}" must be lowercase alphanumeric with dashes, starting with a letter`,
    };
  }

  if (name.startsWith('.') || name.includes('/') || name.includes('\\')) {
    return { valid: false, error: `Service name "${name}" contains invalid path characters` };
  }

  if (RESERVED_SERVICE_NAMES.has(name.toLowerCase())) {
    return { valid: false, error: `Service name "${name}" is reserved` };
  }

  if (name === 'auth' && !options.allowAuth) {
    return {
      valid: false,
      error: `Service name "auth" is reserved for the auth service`,
    };
  }

  return { valid: true };
}

/**
 * Validate an `InitConfig`. Checks name uniqueness across services, valid
 * service names, coherent auth-middleware references, and per-service
 * invariants.
 */
export function validateConfiguration(config: InitConfig): ValidationResult {
  const nameValidation = validateProjectName(config.projectName);
  if (!nameValidation.valid) {
    return nameValidation;
  }

  const validPackageManagers = ['npm', 'yarn', 'bun'];
  if (!validPackageManagers.includes(config.packageManager)) {
    return {
      valid: false,
      error: 'Package manager must be one of: npm, yarn, bun',
    };
  }

  if (!['prisma', 'drizzle'].includes(config.orm)) {
    return { valid: false, error: 'ORM must be one of: prisma, drizzle' };
  }

  if (!Array.isArray(config.services) || config.services.length === 0) {
    return { valid: false, error: 'At least one service must be defined' };
  }

  // Name uniqueness
  const names = new Set<string>();
  let authServices = 0;
  for (const svc of config.services) {
    const svcNameValidation = validateServiceName(svc.name, { allowAuth: svc.kind === 'auth' });
    if (!svcNameValidation.valid) {
      return svcNameValidation;
    }
    if (names.has(svc.name)) {
      return { valid: false, error: `Duplicate service name: ${svc.name}` };
    }
    names.add(svc.name);

    if (svc.kind === 'auth') {
      authServices++;
    }

    const perSvcResult = validateServiceConfig(svc);
    if (!perSvcResult.valid) {
      return perSvcResult;
    }
  }

  if (authServices > 1) {
    return { valid: false, error: 'Only one auth service is allowed per monorepo' };
  }

  const hasAuth = authServices === 1;

  // In a no-auth monorepo, no base service may forward to an auth service.
  if (!hasAuth) {
    for (const svc of config.services) {
      if (svc.kind === 'base' && svc.backend.authMiddleware !== 'none') {
        return {
          valid: false,
          error: `Service "${svc.name}" requests authMiddleware "${svc.backend.authMiddleware}" but no auth service is present`,
        };
      }
    }
  }

  // Port uniqueness
  const backendPorts = new Set<number>();
  const webPorts = new Set<number>();
  for (const svc of config.services) {
    if (backendPorts.has(svc.backend.port)) {
      return { valid: false, error: `Duplicate backend port: ${svc.backend.port}` };
    }
    backendPorts.add(svc.backend.port);

    if (svc.web?.enabled) {
      if (webPorts.has(svc.web.port)) {
        return { valid: false, error: `Duplicate web port: ${svc.web.port}` };
      }
      webPorts.add(svc.web.port);
    }
  }

  return { valid: true };
}

function validateServiceConfig(svc: ServiceConfig): ValidationResult {
  if (typeof svc.backend.port !== 'number' || svc.backend.port <= 0 || svc.backend.port > 65535) {
    return {
      valid: false,
      error: `Service "${svc.name}" has invalid backend port ${svc.backend.port}`,
    };
  }

  if (svc.backend.authMiddleware === 'role-gated') {
    if (!svc.backend.roles || svc.backend.roles.length === 0) {
      return {
        valid: false,
        error: `Service "${svc.name}" uses role-gated auth but has no roles configured`,
      };
    }
  }

  return { valid: true };
}
