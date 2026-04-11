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
      /^DATABASE_URL="postgresql:\/\/postgres:[A-Za-z0-9]{20,}@localhost:5432\/test_env_creds_db\?schema=public"$/m
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
  // ---------------------------------------------------------------------------

  it('setup.sh contains a REGEN_HAPPENED flag gated docker volume reset block', async () => {
    const setup = await fs.readFile(
      path.join(projectDir, 'scripts/setup.sh'),
      'utf-8'
    );

    // The flag is set whenever a .env file is (re)generated this run.
    expect(setup).toMatch(/REGEN_HAPPENED=false/);
    expect(setup).toMatch(/REGEN_HAPPENED=true/);

    // The volume-detection block is gated on the flag + docker being
    // installed + docker info responding.
    expect(setup).toMatch(
      /if \[ "\$REGEN_HAPPENED" = true \] && command -v docker/
    );

    // Per-service volume probe iterates SERVICES and checks
    // postgres_data + redis_data per entry.
    expect(setup).toMatch(/for svc in "\$\{SERVICES\[@\]\}"/);
    expect(setup).toMatch(/postgres_data/);
    expect(setup).toMatch(/redis_data/);

    // Confirmation prompt requires the literal word RESET.
    expect(setup).toMatch(/Type 'RESET' to confirm/);
    expect(setup).toMatch(/if \[ "\$REPLY" = "RESET" \]/);

    // The reset path tears both compose files down with -v.
    expect(setup).toMatch(/docker compose down -v/);
    expect(setup).toMatch(
      /docker compose -f docker-compose\.prod\.yml down -v/
    );
  });

  it('setup.sh enumerates every service from the project config in its volume probe', async () => {
    // The rendered SERVICES=(...) array must include every service name
    // in the project, so the volume-reset loop is complete for multi-
    // service monorepos.
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
