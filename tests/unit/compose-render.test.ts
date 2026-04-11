import { describe, it, expect } from 'vitest';
import YAML from 'yaml';
import { renderDockerCompose } from '../../src/generators/docker-compose.js';
import { buildStackrConfig } from '../../src/generators/service-context.js';
import { minimalConfig } from '../fixtures/configs/minimal.js';
import { cloneInitConfig } from '../fixtures/configs/index.js';
import { coreEntry } from '../../src/config/presets.js';

describe('renderDockerCompose', () => {
  it('produces parseable YAML for a minimal (auth + core) config', () => {
    const stackrConfig = buildStackrConfig(minimalConfig);
    const dev = renderDockerCompose(stackrConfig, 'dev');

    expect(() => YAML.parse(dev)).not.toThrow();
    const parsed = YAML.parse(dev);
    expect(Object.keys(parsed.services)).toEqual(
      expect.arrayContaining(['auth_db', 'auth_redis', 'auth_rest_api', 'core_db', 'core_rest_api'])
    );
    expect(Object.keys(parsed.volumes)).toEqual(
      expect.arrayContaining(['auth_postgres_data', 'core_postgres_data'])
    );
  });

  it('injects AUTH_SERVICE_URL on non-auth services', () => {
    const stackrConfig = buildStackrConfig(minimalConfig);
    const dev = renderDockerCompose(stackrConfig, 'dev');
    const parsed = YAML.parse(dev);

    const coreEnv = parsed.services.core_rest_api.environment;
    const envStr = typeof coreEnv === 'string' ? coreEnv : JSON.stringify(coreEnv);
    expect(envStr).toContain('AUTH_SERVICE_URL');
    expect(envStr).toContain('auth_rest_api');
  });

  it('does NOT inject AUTH_SERVICE_URL on the auth service itself', () => {
    const stackrConfig = buildStackrConfig(minimalConfig);
    const dev = renderDockerCompose(stackrConfig, 'dev');
    const parsed = YAML.parse(dev);

    const authEnv = parsed.services.auth_rest_api.environment;
    const envStr = typeof authEnv === 'string' ? authEnv : JSON.stringify(authEnv);
    expect(envStr).not.toContain('AUTH_SERVICE_URL');
  });

  it('includes managed marker blocks that survive yaml.parse', () => {
    const stackrConfig = buildStackrConfig(minimalConfig);
    const dev = renderDockerCompose(stackrConfig, 'dev');

    expect(dev).toContain('# >>> stackr managed services >>>');
    expect(dev).toContain('# <<< stackr managed services <<<');
    expect(dev).toContain('# >>> stackr managed volumes >>>');
    expect(dev).toContain('# <<< stackr managed volumes <<<');

    // Comments must not break YAML parsing
    expect(() => YAML.parse(dev)).not.toThrow();
  });

  it('is byte-deterministic across two renders of the same config', () => {
    const stackrConfig = buildStackrConfig(minimalConfig);
    const a = renderDockerCompose(stackrConfig, 'dev');
    const b = renderDockerCompose(stackrConfig, 'dev');
    expect(a).toBe(b);
  });

  it('scales to four services (auth + core + scout + manage)', () => {
    const cfg = cloneInitConfig(minimalConfig);
    cfg.services.push(
      coreEntry({
        name: 'scout',
        backend: { port: 8081, eventQueue: true, imageUploads: false, authMiddleware: 'flexible' },
      }),
      coreEntry({
        name: 'manage',
        backend: { port: 8083, eventQueue: false, imageUploads: false, authMiddleware: 'role-gated', roles: ['admin'] },
      })
    );

    const stackrConfig = buildStackrConfig(cfg);
    const dev = renderDockerCompose(stackrConfig, 'dev');
    const parsed = YAML.parse(dev);

    expect(Object.keys(parsed.services)).toEqual(
      expect.arrayContaining([
        'auth_db',
        'auth_rest_api',
        'core_db',
        'core_rest_api',
        'scout_db',
        'scout_rest_api',
        'scout_event_queue',
        'manage_db',
        'manage_rest_api',
      ])
    );
  });

  it('prod overlay renders with rest-api-prod target', () => {
    const stackrConfig = buildStackrConfig(minimalConfig);
    const prod = renderDockerCompose(stackrConfig, 'prod');
    const parsed = YAML.parse(prod);

    expect(parsed.services.auth_rest_api.build.target).toBe('rest-api-prod');
    expect(parsed.services.core_rest_api.build.target).toBe('rest-api-prod');
  });
});
