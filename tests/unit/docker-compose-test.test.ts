import { describe, it, expect } from 'vitest';
import YAML from 'yaml';
import { renderDockerComposeTest } from '../../src/generators/docker-compose-test.js';
import { buildStackrConfig } from '../../src/generators/service-context.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { coreEntry } from '../../src/config/presets.js';
import { TEST_PORT_OFFSET } from '../../src/utils/port-allocator.js';

describe('renderDockerComposeTest', () => {
  it('produces parseable YAML for a minimal (auth + core) config', () => {
    const cfg = buildStackrConfig(minimalConfig);
    const yml = renderDockerComposeTest(cfg);
    expect(() => YAML.parse(yml)).not.toThrow();

    const parsed = YAML.parse(yml);
    expect(Object.keys(parsed.services)).toEqual(
      expect.arrayContaining([
        'auth_db_test',
        'auth_redis_test',
        'auth_db_migrate',
        'auth_rest_api',
        'core_db_test',
        'core_redis_test',
        'core_db_migrate',
        'core_rest_api',
      ])
    );
  });

  it('emits empty output when no service has tests: true', () => {
    const cfg = cloneInitConfig(minimalConfig);
    for (const svc of cfg.services) {
      svc.backend.tests = false;
    }
    const yml = renderDockerComposeTest(buildStackrConfig(cfg));
    expect(yml).toBe('');
  });

  it('omits containers for services with tests: false', () => {
    const cfg = cloneInitConfig(minimalConfig);
    // auth has tests: true, core has tests: false
    cfg.services.find((s) => s.name === 'core')!.backend.tests = false;

    const parsed = YAML.parse(renderDockerComposeTest(buildStackrConfig(cfg)));
    const keys = Object.keys(parsed.services);
    expect(keys).toEqual(
      expect.arrayContaining([
        'auth_db_test',
        'auth_redis_test',
        'auth_db_migrate',
        'auth_rest_api',
      ])
    );
    expect(keys).not.toContain('core_db_test');
    expect(keys).not.toContain('core_rest_api');
    expect(keys).not.toContain('core_db_migrate');
    expect(keys).not.toContain('core_redis_test');
  });

  describe('<svc>_db_test', () => {
    const parsed = YAML.parse(renderDockerComposeTest(buildStackrConfig(minimalConfig)));
    const db = parsed.services.core_db_test;

    it('has profiles [component, e2e]', () => {
      expect(db.profiles).toEqual(['component', 'e2e']);
    });

    it('speed-tunes postgres with fsync=off, synchronous_commit=off, full_page_writes=off', () => {
      const cmd = String(db.command);
      expect(cmd).toContain('fsync=off');
      expect(cmd).toContain('synchronous_commit=off');
      expect(cmd).toContain('full_page_writes=off');
      expect(cmd).toContain('random_page_cost=1.0');
    });

    it('uses tmpfs for the data directory', () => {
      expect(db.tmpfs).toEqual(['/var/lib/postgresql/data']);
    });

    it('exposes a healthcheck with pg_isready', () => {
      expect(db.healthcheck.test.join(' ')).toContain('pg_isready');
    });

    it('binds the host port to 127.0.0.1 at testInfra.dbPort', () => {
      // In minimalConfig auth is idx 0 → core gets 5433-based (+10000 = 15433).
      expect(db.ports).toEqual(['127.0.0.1:15433:5432']);
    });

    it('is attached to the stackr_test network', () => {
      expect(db.networks).toEqual(['stackr_test']);
    });
  });

  describe('<svc>_redis_test', () => {
    const parsed = YAML.parse(renderDockerComposeTest(buildStackrConfig(minimalConfig)));
    const redis = parsed.services.core_redis_test;

    it('has profiles [component, e2e]', () => {
      expect(redis.profiles).toEqual(['component', 'e2e']);
    });

    it('disables persistence via --save "" --appendonly no', () => {
      const cmd = String(redis.command);
      expect(cmd).toContain('--save ""');
      expect(cmd).toContain('--appendonly no');
    });

    it('exposes a healthcheck that uses the redis password', () => {
      expect(redis.healthcheck.test).toContain('redis-cli');
      expect(redis.healthcheck.test.join(' ')).toContain('ping');
    });

    it('binds the host port to 127.0.0.1 at testInfra.redisPort', () => {
      // auth idx 0 → core at 6380 (+10000 = 16380).
      expect(redis.ports).toEqual(['127.0.0.1:16380:6379']);
    });
  });

  describe('<svc>_db_migrate', () => {
    it('is tagged profile [e2e] only (not component)', () => {
      const parsed = YAML.parse(renderDockerComposeTest(buildStackrConfig(minimalConfig)));
      const migrate = parsed.services.core_db_migrate;
      expect(migrate.profiles).toEqual(['e2e']);
    });

    it('depends_on <svc>_db_test with condition: service_healthy', () => {
      const parsed = YAML.parse(renderDockerComposeTest(buildStackrConfig(minimalConfig)));
      const migrate = parsed.services.core_db_migrate;
      expect(migrate.depends_on.core_db_test.condition).toBe('service_healthy');
    });

    it('builds from <svc>/backend with the `base` target (full deps, pre-prune)', () => {
      // The `rest-api-prod` stage runs `npm prune --production` which strips
      // the prisma / drizzle-kit CLIs (both devDeps). Migrations need those
      // CLIs, so the migration container targets the `base` stage instead.
      const parsed = YAML.parse(renderDockerComposeTest(buildStackrConfig(minimalConfig)));
      const migrate = parsed.services.core_db_migrate;
      expect(migrate.build.context).toBe('./core/backend');
      expect(migrate.build.target).toBe('base');
    });

    it('uses prisma db push command when orm === "prisma"', () => {
      // minimalConfig is prisma. `--skip-generate` was dropped in Prisma v7
      // — `prisma generate` already ran during the image build's
      // postinstall, so there's nothing to skip at migration time.
      const parsed = YAML.parse(renderDockerComposeTest(buildStackrConfig(minimalConfig)));
      const migrate = parsed.services.core_db_migrate;
      expect(migrate.command).toContain('prisma db push');
      expect(migrate.command).toContain('--accept-data-loss');
      expect(migrate.command).not.toContain('--skip-generate');
    });

    it('uses drizzle-kit push command when orm === "drizzle"', () => {
      const cfg = cloneInitConfig(minimalConfig);
      cfg.orm = 'drizzle';
      const parsed = YAML.parse(renderDockerComposeTest(buildStackrConfig(cfg)));
      const migrate = parsed.services.core_db_migrate;
      expect(migrate.command).toContain('drizzle-kit push');
      expect(migrate.command).toContain('--force');
    });
  });

  describe('<svc>_rest_api', () => {
    const parsed = YAML.parse(renderDockerComposeTest(buildStackrConfig(minimalConfig)));
    const api = parsed.services.core_rest_api;

    it('is tagged profile [e2e] only — NOT [component]', () => {
      expect(api.profiles).toEqual(['e2e']);
      expect(api.profiles).not.toContain('component');
    });

    it('has the full depends_on chain: db healthy, redis healthy, migrate completed', () => {
      expect(api.depends_on.core_db_test.condition).toBe('service_healthy');
      expect(api.depends_on.core_redis_test.condition).toBe('service_healthy');
      expect(api.depends_on.core_db_migrate.condition).toBe('service_completed_successfully');
    });

    it('binds host port 127.0.0.1:testInfra.appPort:devPort', () => {
      // core dev port is 8080; testInfra.appPort = 8080 + 10000 = 18080.
      expect(api.ports).toEqual(['127.0.0.1:18080:8080']);
    });

    it('layers env_file + environment so NODE_ENV=test wins over .env', () => {
      expect(api.env_file).toEqual(['./core/backend/.env']);
      // environment is a map (YAML 1:2) — check a representative key.
      const envStr = typeof api.environment === 'string' ? api.environment : JSON.stringify(api.environment);
      expect(envStr).toContain('NODE_ENV');
      expect(envStr).toContain('test');
      expect(envStr).toContain('LOG_LEVEL');
      expect(envStr).toContain('error');
    });
  });

  describe('cross-service wiring', () => {
    it('injects AUTH_SERVICE_URL on a base service pointing at the auth rest-api container', () => {
      const parsed = YAML.parse(renderDockerComposeTest(buildStackrConfig(minimalConfig)));
      const coreEnv = parsed.services.core_rest_api.environment;
      const envStr = typeof coreEnv === 'string' ? coreEnv : JSON.stringify(coreEnv);
      expect(envStr).toContain('AUTH_SERVICE_URL');
      // Dev port for auth is 8082 (AUTH_BACKEND_PORT).
      expect(envStr).toContain('http://auth_rest_api:8082');
    });

    it('does NOT inject AUTH_SERVICE_URL on the auth service itself', () => {
      const parsed = YAML.parse(renderDockerComposeTest(buildStackrConfig(minimalConfig)));
      const authEnv = parsed.services.auth_rest_api.environment;
      const envStr = typeof authEnv === 'string' ? authEnv : JSON.stringify(authEnv);
      expect(envStr).not.toContain('AUTH_SERVICE_URL');
    });
  });

  describe('top-level', () => {
    it('declares a stackr_test bridge network', () => {
      const parsed = YAML.parse(renderDockerComposeTest(buildStackrConfig(minimalConfig)));
      expect(parsed.networks.stackr_test.driver).toBe('bridge');
    });

    it('is byte-deterministic across two renders', () => {
      const cfg = buildStackrConfig(minimalConfig);
      const a = renderDockerComposeTest(cfg);
      const b = renderDockerComposeTest(cfg);
      expect(a).toBe(b);
    });
  });

  describe('scales', () => {
    it('handles a third base service (auth + core + scout)', () => {
      const cfg = cloneInitConfig(minimalConfig);
      cfg.services.push(
        coreEntry({
          name: 'scout',
          backend: {
            port: 8081,
            eventQueue: false,
            imageUploads: false,
            authMiddleware: 'flexible',
            tests: true,
          },
        })
      );
      const parsed = YAML.parse(renderDockerComposeTest(buildStackrConfig(cfg)));
      // auth idx 0 → 15432/16379; core idx 1 → 15433/16380; scout idx 2 → 15434/16381.
      expect(parsed.services.scout_db_test.ports).toEqual(['127.0.0.1:15434:5432']);
      expect(parsed.services.scout_redis_test.ports).toEqual(['127.0.0.1:16381:6379']);
      expect(parsed.services.scout_rest_api.ports).toEqual([
        `127.0.0.1:${8081 + TEST_PORT_OFFSET}:8081`,
      ]);
    });
  });
});
