import fs from 'fs-extra';
import path from 'path';
import {
  generateServiceCredentials,
  type ServiceCredentials,
} from '../utils/credentials.js';

/**
 * Write real `.env` files with strong random credentials, leaving
 * committed `.env.example` files untouched.
 *
 * v0.4 did this inside `setup.sh` via `openssl rand`. v0.5 moved it here
 * so:
 *   - `create-stackr` produces a project whose `docker compose up -d`
 *     works immediately — no hand-editing, no stub `change-me-*` values.
 *   - `stackr add service` can reuse the same generator when scaffolding
 *     a new service into an existing project.
 *   - Tests can verify the flow without a bash interpreter.
 *
 * `.env.example` files are ALWAYS preserved as-is — they remain the
 * committed, human-readable documentation with placeholder values.
 *
 * Placeholder strings are transformed by simple string / regex
 * substitution on the already-rendered `.env.example`, which keeps this
 * module decoupled from EJS. The known placeholder patterns are
 * exported below so tests can assert drift if a template is edited
 * without updating this file.
 *
 * Idempotency: if a destination `.env` already exists we skip it —
 * matches the behavior of the old `fs.copy` seed and means reruns of
 * `MonorepoGenerator` (or hand-recovery after a partial failure) never
 * stomp on user-edited credentials.
 */

/** Placeholder substrings in `.env.example.ejs` that this module replaces. */
export const PLACEHOLDER_TOKENS = {
  rootDbPassword: (svcName: string): string => `change-me-${svcName}-db`,
  rootRedisPassword: (svcName: string): string => `change-me-${svcName}-redis`,
  backendDbUrlPatterns: [
    // Auth backend: `postgresql://username:password@host:port/db`
    /postgresql:\/\/username:password@/g,
    // Base backend: `postgresql://postgres:postgres@host:port/db`
    /postgresql:\/\/postgres:postgres@/g,
  ] as readonly RegExp[],
  backendAuthSecretLine:
    /^BETTER_AUTH_SECRET=your-super-secret-auth-key-change-this-in-production$/gm,
  backendRedisPasswordLine: /^REDIS_PASSWORD=your-redis-password$/gm,
} as const;

export interface WriteEnvFilesOptions {
  /** Project root (monorepo) or staging dir — anywhere `.env.example` may live. */
  readonly targetDir: string;
  /** Services whose `<svc>/backend/.env.example` should be materialised. */
  readonly serviceNames: readonly string[];
  /**
   * Pre-computed credentials to use for each service. Missing entries are
   * filled in with `generateServiceCredentials()`. Passing explicit values
   * is useful for tests (deterministic fixtures) and for `stackr add
   * service`, which needs the SAME credentials to land in both the root
   * `.env` block and the new service's `backend/.env`.
   */
  readonly credentialsByService?: ReadonlyMap<string, ServiceCredentials>;
}

export interface WriteEnvFilesResult {
  /** The credentials actually used, including any freshly generated ones. */
  readonly credentialsByService: ReadonlyMap<string, ServiceCredentials>;
  /** `true` iff the root `.env` file was written this call. */
  readonly rootEnvWritten: boolean;
  /** Service names whose `backend/.env` file was written this call. */
  readonly backendEnvsWritten: readonly string[];
}

export async function writeEnvFilesWithCredentials(
  options: WriteEnvFilesOptions
): Promise<WriteEnvFilesResult> {
  const credentialsByService = new Map<string, ServiceCredentials>(
    options.credentialsByService ?? []
  );
  for (const svcName of options.serviceNames) {
    if (!credentialsByService.has(svcName)) {
      credentialsByService.set(svcName, generateServiceCredentials());
    }
  }

  let rootEnvWritten = false;
  const backendEnvsWritten: string[] = [];

  // ---------------------------------------------------------------------------
  // Root .env
  // ---------------------------------------------------------------------------
  const rootExamplePath = path.join(options.targetDir, '.env.example');
  const rootEnvPath = path.join(options.targetDir, '.env');
  if (
    (await fs.pathExists(rootExamplePath)) &&
    !(await fs.pathExists(rootEnvPath))
  ) {
    const exampleContent = await fs.readFile(rootExamplePath, 'utf-8');
    const realContent = substituteRootEnv(exampleContent, credentialsByService);
    await fs.writeFile(rootEnvPath, realContent);
    rootEnvWritten = true;
  }

  // ---------------------------------------------------------------------------
  // Per-service backend/.env
  // ---------------------------------------------------------------------------
  for (const svcName of options.serviceNames) {
    const backendExamplePath = path.join(
      options.targetDir,
      svcName,
      'backend',
      '.env.example'
    );
    const backendEnvPath = path.join(
      options.targetDir,
      svcName,
      'backend',
      '.env'
    );
    if (
      (await fs.pathExists(backendExamplePath)) &&
      !(await fs.pathExists(backendEnvPath))
    ) {
      const exampleContent = await fs.readFile(backendExamplePath, 'utf-8');
      const creds = credentialsByService.get(svcName);
      if (!creds) {
        // Should be unreachable — we populated the map above for every
        // serviceName — but throw loudly rather than silently write
        // garbage if this invariant ever breaks.
        throw new Error(
          `writeEnvFilesWithCredentials: no credentials for service "${svcName}"`
        );
      }
      const realContent = substituteBackendEnv(exampleContent, creds);
      await fs.writeFile(backendEnvPath, realContent);
      backendEnvsWritten.push(svcName);
    }
  }

  return { credentialsByService, rootEnvWritten, backendEnvsWritten };
}

/**
 * Substitute the per-service `change-me-*` placeholders in a rendered
 * root `.env.example` with real values from the credentials map.
 *
 * Uses `split().join()` (not regex) because the service-name interpolation
 * could in theory contain regex metacharacters, and this way we don't
 * have to escape them.
 */
function substituteRootEnv(
  content: string,
  credsByService: ReadonlyMap<string, ServiceCredentials>
): string {
  let result = content;
  for (const [svcName, creds] of credsByService) {
    result = result
      .split(PLACEHOLDER_TOKENS.rootDbPassword(svcName))
      .join(creds.dbPassword);
    result = result
      .split(PLACEHOLDER_TOKENS.rootRedisPassword(svcName))
      .join(creds.redisPassword);
  }
  return result;
}

/**
 * Substitute the placeholder tokens in a rendered per-service
 * `backend/.env.example` with real credentials.
 *
 * DATABASE_URL: both the auth backend's `username:password` placeholder
 * and the base backend's `postgres:postgres` placeholder are rewritten
 * to `postgres:<real dbPassword>` so the resulting URL uses the same
 * real password the root `.env` publishes to Postgres.
 *
 * BETTER_AUTH_SECRET / REDIS_PASSWORD are matched line-by-line with
 * multiline anchors so a substring `your-redis-password` that shows up
 * inside a comment does NOT get touched.
 */
function substituteBackendEnv(
  content: string,
  creds: ServiceCredentials
): string {
  let result = content;
  for (const pattern of PLACEHOLDER_TOKENS.backendDbUrlPatterns) {
    result = result.replace(pattern, `postgresql://postgres:${creds.dbPassword}@`);
  }
  result = result.replace(
    PLACEHOLDER_TOKENS.backendAuthSecretLine,
    `BETTER_AUTH_SECRET=${creds.authSecret}`
  );
  result = result.replace(
    PLACEHOLDER_TOKENS.backendRedisPasswordLine,
    `REDIS_PASSWORD=${creds.redisPassword}`
  );
  return result;
}
