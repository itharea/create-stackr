import { describe, it, expect } from 'vitest';
import {
  AUTH_BACKEND_PORT,
  TEST_PORT_OFFSET,
  computeTestPorts,
} from '../../src/utils/port-allocator.js';
import type { ServiceConfig } from '../../src/types/index.js';
import { authEntry, coreEntry } from '../../src/config/presets.js';

/**
 * Phase 1 contract: `computeTestPorts` emits `dbPort` / `redisPort` /
 * `appPort` for each service, exactly `TEST_PORT_OFFSET` above its dev
 * counterpart. DB/Redis indices walk in declaration order to match
 * `assignInfraPorts` in docker-compose.ts.
 */

function makeAuth(): ServiceConfig {
  return authEntry({ provisioningTargets: ['core'] });
}

function makeCore(port = 8080): ServiceConfig {
  return coreEntry({
    name: 'core',
    backend: {
      port,
      eventQueue: false,
      imageUploads: false,
      authMiddleware: 'standard',
      tests: true,
    },
  });
}

describe('computeTestPorts', () => {
  it('[authEntry] alone returns { auth: { dbPort: 15432, redisPort: 16379, appPort: 18082 } }', () => {
    const auth = makeAuth();
    const result = computeTestPorts([auth]);
    expect(result).toEqual({
      auth: {
        dbPort: 5432 + TEST_PORT_OFFSET,
        redisPort: 6379 + TEST_PORT_OFFSET,
        appPort: AUTH_BACKEND_PORT + TEST_PORT_OFFSET,
      },
    });
    expect(result.auth.appPort).toBe(18082);
  });

  it('[core, auth] preserves declaration order for DB/Redis walk', () => {
    const core = makeCore();
    const auth = makeAuth();
    const result = computeTestPorts([core, auth]);

    expect(result.core).toEqual({
      dbPort: 15432,
      redisPort: 16379,
      appPort: 18080,
    });
    expect(result.auth).toEqual({
      dbPort: 15433,
      redisPort: 16380,
      appPort: 18082,
    });
  });

  it('[auth, core] reverses DB/Redis indices because of declaration order', () => {
    const auth = makeAuth();
    const core = makeCore();
    const result = computeTestPorts([auth, core]);

    expect(result.auth).toEqual({
      dbPort: 15432,
      redisPort: 16379,
      appPort: 18082,
    });
    expect(result.core).toEqual({
      dbPort: 15433,
      redisPort: 16380,
      appPort: 18080,
    });
  });

  it('all three ports are exactly dev + TEST_PORT_OFFSET', () => {
    const core = makeCore();
    const auth = makeAuth();
    const services = [core, auth];
    const result = computeTestPorts(services);

    // App ports derive from each service's own dev backend.port
    expect(result.core.appPort - core.backend.port).toBe(TEST_PORT_OFFSET);
    expect(result.auth.appPort - auth.backend.port).toBe(TEST_PORT_OFFSET);

    // DB/Redis derive from the 5432++/6379++ walk, same base as
    // assignInfraPorts in docker-compose.ts
    expect(result.core.dbPort - 5432).toBe(TEST_PORT_OFFSET);
    expect(result.auth.dbPort - 5433).toBe(TEST_PORT_OFFSET);
    expect(result.core.redisPort - 6379).toBe(TEST_PORT_OFFSET);
    expect(result.auth.redisPort - 6380).toBe(TEST_PORT_OFFSET);
  });

  it('TEST_PORT_OFFSET constant equals 10000', () => {
    expect(TEST_PORT_OFFSET).toBe(10000);
  });
});
