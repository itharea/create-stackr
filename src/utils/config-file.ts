import fs from 'fs-extra';
import path from 'path';
import {
  STACKR_CONFIG_FILENAME,
  STACKR_CONFIG_KEY_ORDER,
  STACKR_CONFIG_VERSION,
  isStackrConfigFile,
  type StackrConfigFile,
} from '../types/config-file.js';

/**
 * Thrown when `loadStackrConfig` is pointed at a directory that doesn't
 * contain a `stackr.config.json` file.
 */
export class StackrConfigNotFoundError extends Error {
  constructor(public readonly projectRoot: string) {
    super(`No stackr.config.json found in ${projectRoot}`);
    this.name = 'StackrConfigNotFoundError';
  }
}

/**
 * Thrown when `stackr.config.json` exists but is malformed — unparseable
 * JSON, missing required fields, or wrong field types.
 */
export class InvalidStackrConfigError extends Error {
  constructor(
    message: string,
    public readonly projectRoot: string,
    public override readonly cause?: Error
  ) {
    super(message);
    this.name = 'InvalidStackrConfigError';
  }
}

/**
 * Thrown when `stackr.config.json` was written by a newer/older schema
 * version that this CLI doesn't know how to read.
 */
export class UnsupportedConfigVersionError extends Error {
  constructor(
    public readonly foundVersion: unknown,
    public readonly supportedVersion: number
  ) {
    super(
      `Unsupported stackr.config.json version: ${String(foundVersion)} ` +
        `(this CLI supports v${supportedVersion})`
    );
    this.name = 'UnsupportedConfigVersionError';
  }
}

/**
 * Read, parse, and validate `<projectRoot>/stackr.config.json`.
 *
 * Throws:
 * - `StackrConfigNotFoundError` if the file is missing
 * - `InvalidStackrConfigError` if JSON parsing or type-guard validation fails
 * - `UnsupportedConfigVersionError` via `migrateConfig` if the version is unknown
 */
export async function loadStackrConfig(projectRoot: string): Promise<StackrConfigFile> {
  const filePath = path.join(projectRoot, STACKR_CONFIG_FILENAME);

  if (!(await fs.pathExists(filePath))) {
    throw new StackrConfigNotFoundError(projectRoot);
  }

  const raw = await fs.readFile(filePath, 'utf-8');

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new InvalidStackrConfigError(
      `Failed to parse ${STACKR_CONFIG_FILENAME}: ${(err as Error).message}`,
      projectRoot,
      err as Error
    );
  }

  try {
    return migrateConfig(parsed);
  } catch (err) {
    if (err instanceof UnsupportedConfigVersionError) {
      throw err;
    }
    throw new InvalidStackrConfigError(
      `Invalid ${STACKR_CONFIG_FILENAME}: ${(err as Error).message}`,
      projectRoot,
      err as Error
    );
  }
}

/**
 * Serialize `cfg` to `<projectRoot>/stackr.config.json` with a stable key
 * order (driven by `STACKR_CONFIG_KEY_ORDER`), 2-space indentation, and a
 * trailing newline.
 *
 * Drives the `JSON.stringify` replacer off `STACKR_CONFIG_KEY_ORDER` so
 * future phases can extend the top-level key set in one place.
 */
export async function saveStackrConfig(
  projectRoot: string,
  cfg: StackrConfigFile
): Promise<void> {
  const filePath = path.join(projectRoot, STACKR_CONFIG_FILENAME);

  // Rebuild the top-level object in canonical key order. Nested object keys
  // fall through to natural order — they're not part of the cross-phase
  // contract that STACKR_CONFIG_KEY_ORDER pins down.
  const ordered: Record<string, unknown> = {};
  for (const key of STACKR_CONFIG_KEY_ORDER) {
    if (cfg[key] !== undefined) {
      ordered[key] = cfg[key];
    }
  }

  const json = JSON.stringify(ordered, null, 2) + '\n';
  await fs.ensureDir(projectRoot);
  await fs.writeFile(filePath, json, 'utf-8');
}

/**
 * Validate and (eventually) migrate a raw parsed JSON value into a
 * `StackrConfigFile`.
 *
 * No migrations implemented yet. Phase 1 validates and returns v1
 * unchanged; future versions add a version-dispatched migration chain here.
 */
export function migrateConfig(raw: unknown): StackrConfigFile {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Expected top-level JSON object');
  }

  const versionField = (raw as Record<string, unknown>).version;

  if (versionField !== STACKR_CONFIG_VERSION) {
    throw new UnsupportedConfigVersionError(versionField, STACKR_CONFIG_VERSION);
  }

  if (!isStackrConfigFile(raw)) {
    throw new Error('Malformed stackr.config.json — failed type guard');
  }

  return raw;
}
