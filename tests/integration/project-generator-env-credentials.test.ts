import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import {
  writeEnvFilesWithCredentials,
  PLACEHOLDER_TOKENS,
} from '../../src/generators/env-files.js';
import type { ServiceCredentials } from '../../src/utils/credentials.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { fullFeaturedConfig } from '../fixtures/configs/full-featured.js';

/**
 * Regression coverage for #54 — v0.4 → v0.5 credential generation loss.
 *
 * v0.4 generated Postgres / Redis / BetterAuth secrets inside setup.sh
 * at project-setup time. v0.5 dropped that step and `monorepo.ts` only
 * `fs.copy`'d .env.example → .env, so the real .env ended up with
 * literal `change-me-*`, `your-redis-password`, and
 * `your-super-secret-auth-key-*` placeholders. Docker compose would
 * technically boot but with attacker-guessable credentials.
 *
 * These tests verify the re-added init-time generator writes REAL
 * random credentials into `.env` files while keeping `.env.example`
 * untouched as committed human-readable documentation.
 */

describe('MonorepoGenerator — init-time credential generation', () => {
  let tempDir: string;
  let projectDir: string;

  beforeAll(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-gen-env-creds-'));
    const cfg = cloneInitConfig(fullFeaturedConfig);
    cfg.projectName = 'test-env-creds';
    cfg.appScheme = 'testenvcreds';
    projectDir = path.join(tempDir, cfg.projectName);
    await new MonorepoGenerator(cfg).generate(projectDir);
  });

  afterAll(async () => {
    await fs.remove(tempDir);
  });

  // ---------------------------------------------------------------------------
  // Root .env
  // ---------------------------------------------------------------------------

  it('writes a root .env file at the project root', async () => {
    expect(await fs.pathExists(path.join(projectDir, '.env'))).toBe(true);
  });

  it('root .env still exists as a committed .env.example with placeholders', async () => {
    const example = await fs.readFile(
      path.join(projectDir, '.env.example'),
      'utf-8'
    );
    // The committed .env.example must keep its placeholder values so
    // git stays human-readable — the fix MUST NOT overwrite it.
    expect(example).toMatch(/change-me-auth-db/);
    expect(example).toMatch(/change-me-core-db/);
    expect(example).toMatch(/change-me-auth-redis/);
    expect(example).toMatch(/change-me-core-redis/);
  });

  it('root .env contains no change-me-* placeholder values', async () => {
    const content = await fs.readFile(path.join(projectDir, '.env'), 'utf-8');
    expect(content).not.toMatch(/change-me-/);
  });

  it('root .env has real random AUTH_DB_PASSWORD (20+ alnum chars)', async () => {
    const content = await fs.readFile(path.join(projectDir, '.env'), 'utf-8');
    const match = content.match(/^AUTH_DB_PASSWORD=(.+)$/m);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/^[A-Za-z0-9]{20,}$/);
    expect(match![1]).not.toContain('change-me');
  });

  it('root .env has real random AUTH_REDIS_PASSWORD (20+ alnum chars)', async () => {
    const content = await fs.readFile(path.join(projectDir, '.env'), 'utf-8');
    const match = content.match(/^AUTH_REDIS_PASSWORD=(.+)$/m);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/^[A-Za-z0-9]{20,}$/);
  });

  it('root .env has real random CORE_DB_PASSWORD and CORE_REDIS_PASSWORD', async () => {
    const content = await fs.readFile(path.join(projectDir, '.env'), 'utf-8');
    const dbMatch = content.match(/^CORE_DB_PASSWORD=(.+)$/m);
    const redisMatch = content.match(/^CORE_REDIS_PASSWORD=(.+)$/m);
    expect(dbMatch).not.toBeNull();
    expect(redisMatch).not.toBeNull();
    expect(dbMatch![1]).toMatch(/^[A-Za-z0-9]{20,}$/);
    expect(redisMatch![1]).toMatch(/^[A-Za-z0-9]{20,}$/);
  });

  it('root .env preserves non-credential defaults (DB_USER, DB_NAME, LOG_LEVEL)', async () => {
    const content = await fs.readFile(path.join(projectDir, '.env'), 'utf-8');
    expect(content).toMatch(/^AUTH_DB_USER=postgres$/m);
    expect(content).toMatch(/^CORE_DB_USER=postgres$/m);
    expect(content).toMatch(/^AUTH_DB_NAME=test_env_creds_auth$/m);
    expect(content).toMatch(/^CORE_DB_NAME=test_env_creds_core$/m);
    expect(content).toMatch(/^LOG_LEVEL=info$/m);
  });

  it('root .env passwords for each service differ from each other', async () => {
    const content = await fs.readFile(path.join(projectDir, '.env'), 'utf-8');
    const authDb = content.match(/^AUTH_DB_PASSWORD=(.+)$/m)![1];
    const coreDb = content.match(/^CORE_DB_PASSWORD=(.+)$/m)![1];
    const authRedis = content.match(/^AUTH_REDIS_PASSWORD=(.+)$/m)![1];
    const coreRedis = content.match(/^CORE_REDIS_PASSWORD=(.+)$/m)![1];
    expect(authDb).not.toBe(coreDb);
    expect(authRedis).not.toBe(coreRedis);
    expect(authDb).not.toBe(authRedis);
  });

  // ---------------------------------------------------------------------------
  // Per-service backend/.env
  // ---------------------------------------------------------------------------

  it('writes auth/backend/.env with real credentials', async () => {
    const envPath = path.join(projectDir, 'auth/backend/.env');
    expect(await fs.pathExists(envPath)).toBe(true);
    const content = await fs.readFile(envPath, 'utf-8');

    // DATABASE_URL must not contain the `username:password` placeholder
    expect(content).not.toMatch(/postgresql:\/\/username:password@/);
    expect(content).toMatch(
      /^DATABASE_URL="postgresql:\/\/postgres:[A-Za-z0-9]{20,}@localhost:5432\/test_env_creds_auth\?schema=public"$/m
    );

    // BETTER_AUTH_SECRET must be a real 64-char hex secret
    const authSecretMatch = content.match(/^BETTER_AUTH_SECRET=(.+)$/m);
    expect(authSecretMatch).not.toBeNull();
    expect(authSecretMatch![1]).toMatch(/^[0-9a-f]{64}$/);
    expect(authSecretMatch![1]).not.toContain('your-super-secret-auth-key');

    // REDIS_PASSWORD must be real, not `your-redis-password`
    const redisMatch = content.match(/^REDIS_PASSWORD=(.+)$/m);
    expect(redisMatch).not.toBeNull();
    expect(redisMatch![1]).toMatch(/^[A-Za-z0-9]{20,}$/);
    expect(redisMatch![1]).not.toBe('your-redis-password');
  });

  it('writes core/backend/.env with real credentials', async () => {
    const envPath = path.join(projectDir, 'core/backend/.env');
    expect(await fs.pathExists(envPath)).toBe(true);
    const content = await fs.readFile(envPath, 'utf-8');

    // Base backend placeholder is `postgres:postgres`; it must be replaced.
    expect(content).not.toMatch(/postgresql:\/\/postgres:postgres@/);
    expect(content).toMatch(
      /^DATABASE_URL="postgresql:\/\/postgres:[A-Za-z0-9]{20,}@localhost:5432\/test_env_creds_core\?schema=public"$/m
    );

    const redisMatch = content.match(/^REDIS_PASSWORD=(.+)$/m);
    expect(redisMatch).not.toBeNull();
    expect(redisMatch![1]).not.toBe('your-redis-password');
    expect(redisMatch![1]).toMatch(/^[A-Za-z0-9]{20,}$/);
  });

  it('per-service backend/.env.example files are left untouched as placeholders', async () => {
    const authExample = await fs.readFile(
      path.join(projectDir, 'auth/backend/.env.example'),
      'utf-8'
    );
    expect(authExample).toMatch(/postgresql:\/\/username:password@/);
    expect(authExample).toMatch(
      /BETTER_AUTH_SECRET=your-super-secret-auth-key-change-this-in-production/
    );
    expect(authExample).toMatch(/REDIS_PASSWORD=your-redis-password/);

    const coreExample = await fs.readFile(
      path.join(projectDir, 'core/backend/.env.example'),
      'utf-8'
    );
    expect(coreExample).toMatch(/postgresql:\/\/postgres:postgres@/);
    expect(coreExample).toMatch(/REDIS_PASSWORD=your-redis-password/);
  });

  // ---------------------------------------------------------------------------
  // Setup.sh — docker volume conflict check (#55)
  //
  // Regression guard for the v0.5 bug where the volume-collision check
  // was gated on a `REGEN_HAPPENED` flag that only fired when setup.sh
  // itself re-copied a .env.example file. The CLI writes real creds at
  // init time, so on a fresh `create-stackr` run the .env already exists
  // and setup.sh never set the flag — the whole block was silently
  // skipped and users who re-used a project name hit cryptic Postgres
  // auth failures on the next `docker compose up`. The fix restores
  // v0.4's unconditional `docker volume ls | grep '^<project>_'` probe.
  // ---------------------------------------------------------------------------

  it('setup.sh runs the docker volume probe unconditionally (no REGEN_HAPPENED gate)', async () => {
    const setup = await fs.readFile(
      path.join(projectDir, 'scripts/setup.sh'),
      'utf-8'
    );

    // The broken gating flag must be gone. If this re-appears, the
    // check will silently skip on fresh `create-stackr` runs again.
    expect(setup).not.toMatch(/REGEN_HAPPENED/);

    // The volume-detection block is gated only on docker being
    // installed + docker info responding — nothing else.
    expect(setup).toMatch(
      /if command -v docker >\/dev\/null 2>&1 && docker info >\/dev\/null 2>&1; then/
    );
  });

  it('setup.sh enumerates docker volumes by project prefix using v0.4 semantics', async () => {
    const setup = await fs.readFile(
      path.join(projectDir, 'scripts/setup.sh'),
      'utf-8'
    );

    // Matches v0.4's has_existing_volumes: list every volume, filter by
    // the compose project name prefix. Using a case-statement prefix
    // match (not a per-service suffix enumeration) so custom volumes
    // declared by future services are caught too.
    expect(setup).toMatch(
      /COMPOSE_PROJECT="\$\(basename "\$ROOT_DIR"\)"/
    );
    expect(setup).toMatch(/docker volume ls --format '\{\{\.Name\}\}'/);
    expect(setup).toMatch(/"\$\{COMPOSE_PROJECT\}_"\*\) EXISTING_VOLUMES\+=/);
  });

  it('setup.sh prompts for a typed RESET and tears down both compose files', async () => {
    const setup = await fs.readFile(
      path.join(projectDir, 'scripts/setup.sh'),
      'utf-8'
    );

    // Confirmation prompt requires the literal word RESET.
    expect(setup).toMatch(/Type 'RESET' to confirm/);
    expect(setup).toMatch(/if \[ "\$REPLY" = "RESET" \]/);

    // The reset path tears both compose files down with -v, and
    // follows up with individual `docker volume rm` for any stragglers
    // (renamed services, etc.) that `down -v` wouldn't touch.
    expect(setup).toMatch(/docker compose down -v/);
    expect(setup).toMatch(
      /docker compose -f docker-compose\.prod\.yml down -v/
    );
    expect(setup).toMatch(/docker volume rm "\$vol"/);
  });

  it('setup.sh runs the volume check BEFORE installing dependencies', async () => {
    // We moved the check above the install loop so the user isn't
    // forced to wait through a full `<pm> install` pass only to hit
    // a Postgres auth failure on `docker compose up` afterwards. If
    // the check drifts back below the installs, this test fires.
    const setup = await fs.readFile(
      path.join(projectDir, 'scripts/setup.sh'),
      'utf-8'
    );

    const volumeCheckIdx = setup.indexOf('Destroy the volumes above?');
    const installIdx = setup.indexOf('Installing monorepo-root devDependencies');
    expect(volumeCheckIdx).toBeGreaterThan(0);
    expect(installIdx).toBeGreaterThan(0);
    expect(volumeCheckIdx).toBeLessThan(installIdx);
  });

  // ---------------------------------------------------------------------------
  // Web .env.local generation (#60)
  // ---------------------------------------------------------------------------

  it('writes core/web/.env.local with correct ports at init time', async () => {
    const envLocalPath = path.join(projectDir, 'core/web/.env.local');
    expect(await fs.pathExists(envLocalPath)).toBe(true);
    const content = await fs.readFile(envLocalPath, 'utf-8');

    // Must contain the core service's configured ports, not hardcoded defaults
    expect(content).toMatch(/^BACKEND_URL=http:\/\/localhost:8080$/m);
    expect(content).toMatch(/^NEXT_PUBLIC_APP_URL=http:\/\/localhost:3000$/m);
  });

  it('writes auth/web/.env.local when auth has adminDashboard enabled', async () => {
    const envLocalPath = path.join(projectDir, 'auth/web/.env.local');
    expect(await fs.pathExists(envLocalPath)).toBe(true);
    const content = await fs.readFile(envLocalPath, 'utf-8');

    expect(content).toMatch(/^BACKEND_URL=http:\/\/localhost:8082$/m);
  });

  it('core/web/.env.local includes AUTH_SERVICE_URL pointing at auth backend', async () => {
    const content = await fs.readFile(
      path.join(projectDir, 'core/web/.env.local'),
      'utf-8'
    );
    expect(content).toMatch(/^AUTH_SERVICE_URL=http:\/\/localhost:8082$/m);
  });

  it('web .env.example files are left untouched (not overwritten by .env.local generation)', async () => {
    const example = await fs.readFile(
      path.join(projectDir, 'core/web/.env.example'),
      'utf-8'
    );
    // The .env.example must exist with real rendered values — it serves
    // as committed documentation, while .env.local is gitignored.
    expect(example).toMatch(/NEXT_PUBLIC_APP_URL/);
    expect(example).toMatch(/BACKEND_URL/);
  });

  it('setup.sh creates web/.env.local from web/.env.example as safety net', async () => {
    const setup = await fs.readFile(
      path.join(projectDir, 'scripts/setup.sh'),
      'utf-8'
    );

    expect(setup).toMatch(/\$svc\/web\/\.env\.local/);
    expect(setup).toMatch(/\$svc\/web\/\.env\.example/);
    expect(setup).toMatch(/Created \$svc\/web\/\.env\.local/);
  });

  // ---------------------------------------------------------------------------
  // Auth web admin dashboard (#60)
  // ---------------------------------------------------------------------------

  it('scaffolds auth/web as an admin dashboard, not the generic base template', async () => {
    // The auth admin dashboard must have its own login, dashboard, and users pages
    expect(await fs.pathExists(path.join(projectDir, 'auth/web/src/app/(auth)/login/page.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'auth/web/src/app/(dashboard)/dashboard/page.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'auth/web/src/app/(dashboard)/users/page.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'auth/web/src/app/(dashboard)/users/[id]/page.tsx'))).toBe(true);
  });

  it('auth/web root page redirects to /dashboard (not the generic landing page)', async () => {
    const rootPage = await fs.readFile(
      path.join(projectDir, 'auth/web/src/app/page.tsx'),
      'utf-8'
    );
    expect(rootPage).toMatch(/redirect.*\/dashboard/);
    // Must NOT contain the generic landing page content
    expect(rootPage).not.toMatch(/Build something/);
  });

  it('auth/web package.json uses the auth web port for dev server', async () => {
    const pkgJson = JSON.parse(
      await fs.readFile(path.join(projectDir, 'auth/web/package.json'), 'utf-8')
    );
    expect(pkgJson.scripts.dev).toContain('--port 3002');
    expect(pkgJson.dependencies).toHaveProperty('sonner');
    expect(pkgJson.dependencies).toHaveProperty('@radix-ui/react-dialog');
  });

  it('auth/web has dashboard sidebar and admin actions', async () => {
    expect(await fs.pathExists(path.join(projectDir, 'auth/web/src/components/dashboard-sidebar.tsx'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'auth/web/src/lib/admin/actions.ts'))).toBe(true);
    expect(await fs.pathExists(path.join(projectDir, 'auth/web/src/lib/auth/actions.ts'))).toBe(true);
  });

  it('auth/web layout metadata references the project name', async () => {
    const layout = await fs.readFile(
      path.join(projectDir, 'auth/web/src/app/layout.tsx'),
      'utf-8'
    );
    expect(layout).toMatch(/test-env-creds.*Auth Admin/);
  });

  it('setup.sh still enumerates every project service in SERVICES for the install loop', async () => {
    // The rendered SERVICES=(...) array must still include every
    // service name in the project — the install loop depends on it,
    // even though the volume probe now uses a prefix match instead.
    const setup = await fs.readFile(
      path.join(projectDir, 'scripts/setup.sh'),
      'utf-8'
    );

    const match = setup.match(/^SERVICES=\((.+)\)$/m);
    expect(match).not.toBeNull();
    const servicesLine = match![1];
    expect(servicesLine).toContain('"auth"');
    expect(servicesLine).toContain('"core"');
  });
});

// =============================================================================
// Unit coverage for writeEnvFilesWithCredentials — focused on substitution
// semantics with a deterministic fixture.
// =============================================================================

describe('writeEnvFilesWithCredentials — substitution semantics', () => {
  let stagingDir: string;

  beforeAll(async () => {
    stagingDir = await fs.mkdtemp(path.join(os.tmpdir(), 'env-files-unit-'));
  });

  afterAll(async () => {
    await fs.remove(stagingDir);
  });

  it('substitutes every change-me-<svc>-db / -redis occurrence in root .env', async () => {
    const dir = await fs.mkdtemp(path.join(stagingDir, 'root-'));
    await fs.writeFile(
      path.join(dir, '.env.example'),
      [
        'LOG_LEVEL=info',
        '# >>> stackr managed env >>>',
        '# ---- auth ----',
        'AUTH_DB_USER=postgres',
        'AUTH_DB_PASSWORD=change-me-auth-db',
        'AUTH_DB_NAME=demo_auth',
        'AUTH_REDIS_PASSWORD=change-me-auth-redis',
        '',
        '# ---- core ----',
        'CORE_DB_USER=postgres',
        'CORE_DB_PASSWORD=change-me-core-db',
        'CORE_DB_NAME=demo_core',
        'CORE_REDIS_PASSWORD=change-me-core-redis',
        '# <<< stackr managed env <<<',
        '',
      ].join('\n')
    );

    const creds = new Map<string, ServiceCredentials>([
      ['auth', { dbPassword: 'AuthDbPw1234567890123456', redisPassword: 'AuthRedisPw123456789012A', authSecret: 'a'.repeat(64) }],
      ['core', { dbPassword: 'CoreDbPw1234567890123456', redisPassword: 'CoreRedisPw123456789012B', authSecret: 'b'.repeat(64) }],
    ]);

    const result = await writeEnvFilesWithCredentials({
      targetDir: dir,
      serviceNames: ['auth', 'core'],
      credentialsByService: creds,
    });

    expect(result.rootEnvWritten).toBe(true);
    expect(result.backendEnvsWritten).toEqual([]);

    const env = await fs.readFile(path.join(dir, '.env'), 'utf-8');
    expect(env).toMatch(/^AUTH_DB_PASSWORD=AuthDbPw1234567890123456$/m);
    expect(env).toMatch(/^AUTH_REDIS_PASSWORD=AuthRedisPw123456789012A$/m);
    expect(env).toMatch(/^CORE_DB_PASSWORD=CoreDbPw1234567890123456$/m);
    expect(env).toMatch(/^CORE_REDIS_PASSWORD=CoreRedisPw123456789012B$/m);
    expect(env).not.toMatch(/change-me-/);
  });

  it('substitutes auth backend DATABASE_URL username:password + BETTER_AUTH_SECRET + REDIS_PASSWORD', async () => {
    const dir = await fs.mkdtemp(path.join(stagingDir, 'auth-backend-'));
    await fs.ensureDir(path.join(dir, 'auth/backend'));
    await fs.writeFile(
      path.join(dir, 'auth/backend/.env.example'),
      [
        'NODE_ENV=development',
        'DATABASE_URL="postgresql://username:password@localhost:5432/demo_db?schema=public"',
        'BETTER_AUTH_SECRET=your-super-secret-auth-key-change-this-in-production',
        'REDIS_PASSWORD=your-redis-password',
        '',
      ].join('\n')
    );

    const creds = new Map<string, ServiceCredentials>([
      [
        'auth',
        {
          dbPassword: 'AUTH_DB_PW_16CHARSSS',
          redisPassword: 'AUTH_REDIS_PW_16CHR_',
          authSecret: 'c'.repeat(64),
        },
      ],
    ]);

    const result = await writeEnvFilesWithCredentials({
      targetDir: dir,
      serviceNames: ['auth'],
      credentialsByService: creds,
    });

    expect(result.backendEnvsWritten).toEqual(['auth']);

    const env = await fs.readFile(
      path.join(dir, 'auth/backend/.env'),
      'utf-8'
    );
    expect(env).toMatch(
      /^DATABASE_URL="postgresql:\/\/postgres:AUTH_DB_PW_16CHARSSS@localhost:5432\/demo_db\?schema=public"$/m
    );
    expect(env).toMatch(/^BETTER_AUTH_SECRET=c{64}$/m);
    expect(env).toMatch(/^REDIS_PASSWORD=AUTH_REDIS_PW_16CHR_$/m);
    expect(env).not.toMatch(/username:password/);
    expect(env).not.toMatch(/your-super-secret-auth-key/);
    expect(env).not.toMatch(/your-redis-password/);
  });

  it('substitutes base backend DATABASE_URL postgres:postgres placeholder', async () => {
    const dir = await fs.mkdtemp(path.join(stagingDir, 'base-backend-'));
    await fs.ensureDir(path.join(dir, 'core/backend'));
    await fs.writeFile(
      path.join(dir, 'core/backend/.env.example'),
      [
        'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/demo_core?schema=public"',
        'REDIS_PASSWORD=your-redis-password',
        '',
      ].join('\n')
    );

    const creds = new Map<string, ServiceCredentials>([
      [
        'core',
        {
          dbPassword: 'CORE_DB_PW_16CHARSSS',
          redisPassword: 'CORE_REDIS_PW_16CHR_',
          authSecret: 'd'.repeat(64),
        },
      ],
    ]);

    await writeEnvFilesWithCredentials({
      targetDir: dir,
      serviceNames: ['core'],
      credentialsByService: creds,
    });

    const env = await fs.readFile(
      path.join(dir, 'core/backend/.env'),
      'utf-8'
    );
    expect(env).toMatch(
      /^DATABASE_URL="postgresql:\/\/postgres:CORE_DB_PW_16CHARSSS@localhost:5432\/demo_core\?schema=public"$/m
    );
    expect(env).toMatch(/^REDIS_PASSWORD=CORE_REDIS_PW_16CHR_$/m);
    expect(env).not.toMatch(/postgres:postgres@/);
  });

  it('is idempotent — skips files that already exist', async () => {
    const dir = await fs.mkdtemp(path.join(stagingDir, 'idempotent-'));
    await fs.writeFile(
      path.join(dir, '.env.example'),
      'AUTH_DB_PASSWORD=change-me-auth-db\n'
    );
    // Pre-existing .env with a user-edited value.
    await fs.writeFile(path.join(dir, '.env'), 'AUTH_DB_PASSWORD=hand-edited\n');

    const result = await writeEnvFilesWithCredentials({
      targetDir: dir,
      serviceNames: ['auth'],
      credentialsByService: new Map([
        [
          'auth',
          {
            dbPassword: 'random1234567890123456AB',
            redisPassword: 'random1234567890123456CD',
            authSecret: 'e'.repeat(64),
          },
        ],
      ]),
    });

    expect(result.rootEnvWritten).toBe(false);
    const env = await fs.readFile(path.join(dir, '.env'), 'utf-8');
    expect(env).toBe('AUTH_DB_PASSWORD=hand-edited\n');
  });

  it('auto-generates credentials when none are supplied', async () => {
    const dir = await fs.mkdtemp(path.join(stagingDir, 'auto-'));
    await fs.writeFile(
      path.join(dir, '.env.example'),
      'AUTH_DB_PASSWORD=change-me-auth-db\nAUTH_REDIS_PASSWORD=change-me-auth-redis\n'
    );

    const result = await writeEnvFilesWithCredentials({
      targetDir: dir,
      serviceNames: ['auth'],
    });

    expect(result.rootEnvWritten).toBe(true);
    expect(result.credentialsByService.has('auth')).toBe(true);

    const env = await fs.readFile(path.join(dir, '.env'), 'utf-8');
    const match = env.match(/^AUTH_DB_PASSWORD=(.+)$/m);
    expect(match).not.toBeNull();
    expect(match![1]).toMatch(/^[A-Za-z0-9]{20,}$/);
  });

  it('copies web/.env.example to web/.env.local when the web dir exists', async () => {
    const dir = await fs.mkdtemp(path.join(stagingDir, 'web-env-'));
    await fs.ensureDir(path.join(dir, 'core/web'));
    await fs.writeFile(
      path.join(dir, 'core/web/.env.example'),
      'NEXT_PUBLIC_APP_URL=http://localhost:3000\nBACKEND_URL=http://localhost:8080\n'
    );

    const result = await writeEnvFilesWithCredentials({
      targetDir: dir,
      serviceNames: ['core'],
      credentialsByService: new Map([
        [
          'core',
          {
            dbPassword: 'CORE_DB_PW_16CHARSSS',
            redisPassword: 'CORE_REDIS_PW_16CHR_',
            authSecret: 'd'.repeat(64),
          },
        ],
      ]),
    });

    expect(result.webEnvLocalsWritten).toEqual(['core']);
    const envLocal = await fs.readFile(
      path.join(dir, 'core/web/.env.local'),
      'utf-8'
    );
    expect(envLocal).toMatch(/^NEXT_PUBLIC_APP_URL=http:\/\/localhost:3000$/m);
    expect(envLocal).toMatch(/^BACKEND_URL=http:\/\/localhost:8080$/m);
  });

  it('skips web/.env.local if it already exists', async () => {
    const dir = await fs.mkdtemp(path.join(stagingDir, 'web-existing-'));
    await fs.ensureDir(path.join(dir, 'core/web'));
    await fs.writeFile(
      path.join(dir, 'core/web/.env.example'),
      'BACKEND_URL=http://localhost:8080\n'
    );
    await fs.writeFile(
      path.join(dir, 'core/web/.env.local'),
      'BACKEND_URL=http://localhost:9999\n'
    );

    const result = await writeEnvFilesWithCredentials({
      targetDir: dir,
      serviceNames: ['core'],
      credentialsByService: new Map([
        ['core', { dbPassword: 'x'.repeat(24), redisPassword: 'y'.repeat(24), authSecret: 'z'.repeat(64) }],
      ]),
    });

    expect(result.webEnvLocalsWritten).toEqual([]);
    const envLocal = await fs.readFile(
      path.join(dir, 'core/web/.env.local'),
      'utf-8'
    );
    expect(envLocal).toBe('BACKEND_URL=http://localhost:9999\n');
  });

  it('PLACEHOLDER_TOKENS are exported and match the expected strings', () => {
    // Drift guard: if a template edits a placeholder string without
    // updating env-files.ts, these constants will no longer match the
    // template and the MonorepoGenerator tests above will fail loudly.
    expect(PLACEHOLDER_TOKENS.rootDbPassword('auth')).toBe('change-me-auth-db');
    expect(PLACEHOLDER_TOKENS.rootRedisPassword('core')).toBe(
      'change-me-core-redis'
    );
    expect(
      'postgresql://username:password@localhost'.match(
        PLACEHOLDER_TOKENS.backendDbUrlPatterns[0]
      )
    ).not.toBeNull();
    expect(
      'postgresql://postgres:postgres@localhost'.match(
        PLACEHOLDER_TOKENS.backendDbUrlPatterns[1]
      )
    ).not.toBeNull();
  });
});
