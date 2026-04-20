import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { MonorepoGenerator } from '../../src/generators/monorepo.js';
import { PRESETS, loadPreset } from '../../src/config/presets.js';
import { applyCliOptionsToPreset } from '../../src/prompts/index.js';
import type { InitConfig } from '../../src/types/index.js';
import { TEST_PORT_OFFSET } from '../../src/utils/port-allocator.js';

/**
 * Phase 3: every preset that opts into tests scaffolds a complete
 * `tests/` subtree (helpers + component tests + vitest config + .env.test)
 * in every backend, with the per-kind + per-ORM branches resolving to
 * the right file names.
 */
describe('MonorepoGenerator — tests/ scaffold', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'stackr-tests-scaffold-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe.each(PRESETS.map((p) => [p.name] as const))('%s preset', (presetName) => {
    async function generate(): Promise<{ projectDir: string; config: InitConfig }> {
      const body = loadPreset(presetName);
      const config: InitConfig = applyCliOptionsToPreset(
        body,
        `scaffold-${presetName.toLowerCase()}`,
        'npm',
        {}
      );
      const projectDir = path.join(tempDir, config.projectName);
      await new MonorepoGenerator(config).generate(projectDir);
      return { projectDir, config };
    }

    it('writes helpers + component tests + vitest config + .env.test in every tests-enabled backend', async () => {
      const { projectDir, config } = await generate();
      const hasAuthService = config.services.some((s) => s.kind === 'auth');

      for (const svc of config.services.filter((s) => s.backend.tests)) {
        const backend = path.join(projectDir, svc.name, 'backend');

        // Helpers (ORM-suffix stripping must resolve each `.drizzle.ts` /
        // `.prisma.ts` pair to a single `.ts` file).
        expect(await fs.pathExists(path.join(backend, 'tests/helpers/global-setup.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(backend, 'tests/helpers/global-teardown.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(backend, 'tests/helpers/load-env.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(backend, 'tests/helpers/app.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(backend, 'tests/helpers/db.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(backend, 'tests/helpers/unique.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(backend, 'tests/helpers/seed.ts'))).toBe(true);

        // Nock defaults: only for base services when an auth peer exists.
        const nockPath = path.join(backend, 'tests/helpers/nock-defaults.ts');
        if (hasAuthService && svc.kind !== 'auth') {
          expect(await fs.pathExists(nockPath)).toBe(true);
        } else {
          expect(await fs.pathExists(nockPath)).toBe(false);
        }

        // Shared component tests.
        expect(await fs.pathExists(path.join(backend, 'tests/component/rest-api/health.test.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(backend, 'tests/component/rest-api/root.test.ts'))).toBe(true);

        // Session smoke: same gate as nock-defaults.
        const sessionPath = path.join(backend, 'tests/component/rest-api/session.test.ts');
        if (hasAuthService && svc.kind !== 'auth') {
          expect(await fs.pathExists(sessionPath)).toBe(true);
        } else {
          expect(await fs.pathExists(sessionPath)).toBe(false);
        }

        // Auth-specific component tests.
        const signUpPath = path.join(backend, 'tests/component/rest-api/sign-up.test.ts');
        if (svc.kind === 'auth') {
          expect(await fs.pathExists(signUpPath)).toBe(true);
          expect(await fs.pathExists(path.join(backend, 'tests/component/rest-api/sign-in.test.ts'))).toBe(true);
          expect(await fs.pathExists(path.join(backend, 'tests/component/rest-api/get-session.test.ts'))).toBe(true);
        } else {
          expect(await fs.pathExists(signUpPath)).toBe(false);
        }

        // Per-service test config.
        expect(await fs.pathExists(path.join(backend, 'vitest.config.ts'))).toBe(true);
        expect(await fs.pathExists(path.join(backend, '.env.test'))).toBe(true);

        // .env.test bakes in concrete credentials + the +10000 ports.
        const envTest = await fs.readFile(path.join(backend, '.env.test'), 'utf-8');
        expect(envTest).toContain('NODE_ENV=test');
        const expectedDbPort = 5432 + config.services.indexOf(svc) + TEST_PORT_OFFSET;
        const expectedRedisPort = 6379 + config.services.indexOf(svc) + TEST_PORT_OFFSET;
        expect(envTest).toContain(`127.0.0.1:${expectedDbPort}`);
        expect(envTest).toContain(`REDIS_PORT=${expectedRedisPort}`);
        // Real credentials are baked in (not the change-me placeholders)
        // because writeEnvFilesWithCredentials threaded them through.
        expect(envTest).not.toContain(`change-me-${svc.name}-db`);
        expect(envTest).not.toContain(`change-me-${svc.name}-redis`);
        // Only base services with an auth peer forward AUTH_SERVICE_URL.
        if (hasAuthService && svc.kind !== 'auth') {
          expect(envTest).toContain('AUTH_SERVICE_URL=http://mock.local');
        } else {
          expect(envTest).not.toContain('AUTH_SERVICE_URL=');
        }

        // Package.json picks up the test scripts + devDeps.
        const pkg = JSON.parse(await fs.readFile(path.join(backend, 'package.json'), 'utf-8'));
        expect(pkg.scripts.test).toBe('vitest run');
        expect(pkg.scripts['test:watch']).toBe('vitest');
        expect(pkg.devDependencies.vitest).toBeDefined();
        expect(pkg.devDependencies['@vitest/coverage-v8']).toBeDefined();
        expect(pkg.devDependencies.nock).toBeDefined();
        expect(pkg.devDependencies['is-ci']).toBeDefined();
        expect(pkg.devDependencies.execa).toBeDefined();
      }
    });

    it('.env.test DATABASE_URL credentials match the real root .env', async () => {
      const { projectDir, config } = await generate();
      const rootEnv = await fs.readFile(path.join(projectDir, '.env'), 'utf-8');

      for (const svc of config.services.filter((s) => s.backend.tests)) {
        const upper = svc.name.toUpperCase().replace(/-/g, '_');
        const dbPwMatch = rootEnv.match(new RegExp(`^${upper}_DB_PASSWORD=(.+)$`, 'm'));
        const redisPwMatch = rootEnv.match(new RegExp(`^${upper}_REDIS_PASSWORD=(.+)$`, 'm'));
        expect(dbPwMatch, `${svc.name} DB password missing from root .env`).not.toBeNull();
        expect(redisPwMatch, `${svc.name} Redis password missing from root .env`).not.toBeNull();

        const envTest = await fs.readFile(
          path.join(projectDir, svc.name, 'backend', '.env.test'),
          'utf-8'
        );
        expect(envTest).toContain(`:${dbPwMatch![1]}@`);
        expect(envTest).toContain(`REDIS_PASSWORD=${redisPwMatch![1]}`);
      }
    });
  });
});
