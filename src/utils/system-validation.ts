import { errors } from './errors.js';
import { execa } from 'execa';

/**
 * Check if Node.js version meets minimum requirement
 */
export function validateNodeVersion(): void {
  const currentVersion = process.version;
  const requiredVersion = '18.0.0';

  const current = parseVersion(currentVersion);
  const required = parseVersion(requiredVersion);

  if (current.major < required.major) {
    throw errors.nodeVersionTooLow(currentVersion, requiredVersion);
  }
}

/**
 * Check if package manager is available
 */
export async function validatePackageManager(pm: 'npm' | 'yarn' | 'bun'): Promise<void> {
  try {
    await execa(pm, ['--version'], { reject: true });
  } catch {
    throw errors.packageManagerNotFound(pm);
  }
}

function parseVersion(version: string): { major: number; minor: number; patch: number } {
  const cleaned = version.replace(/^v/, '');
  const [major, minor, patch] = cleaned.split('.').map(Number);
  return { major, minor, patch };
}
