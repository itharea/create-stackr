import type { ServiceConfig } from '../types/index.js';

/**
 * Port allocation for services.
 *
 * Convention (see `plans/meta_phases.md` §1 decision #5):
 * - Auth backend is fixed at 8082.
 * - Base service backends start at 8080, increment by 1, skipping 8082.
 * - Base service web frontends start at 3000, increment by 1, skipping 3002.
 * - Auth web admin dashboard is fixed at 3002.
 *
 * `allocateBackendPort(services, preferred?)` returns the next free backend
 * port NOT already taken by a service in `services`. If `preferred` is
 * supplied, it validates that the preferred port is free (throws on
 * collision with an existing service).
 *
 * Phase 3 also consumes these helpers from `stackr add service`, which is
 * why they're standalone rather than inlined into the generator.
 */

const RESERVED_AUTH_BACKEND_PORT = 8082;
const RESERVED_AUTH_WEB_PORT = 3002;
const BASE_BACKEND_START = 8080;
const BASE_WEB_START = 3000;

export class PortCollisionError extends Error {
  constructor(public readonly port: number, public readonly kind: 'backend' | 'web') {
    super(`Requested ${kind} port ${port} is already taken or reserved`);
    this.name = 'PortCollisionError';
  }
}

function collectBackendPorts(services: readonly ServiceConfig[]): Set<number> {
  const ports = new Set<number>();
  for (const svc of services) {
    if (typeof svc.backend.port === 'number') {
      ports.add(svc.backend.port);
    }
  }
  return ports;
}

function collectWebPorts(services: readonly ServiceConfig[]): Set<number> {
  const ports = new Set<number>();
  for (const svc of services) {
    if (svc.web?.enabled && typeof svc.web.port === 'number') {
      ports.add(svc.web.port);
    }
  }
  return ports;
}

/**
 * Pick the next free backend port for a new base service.
 *
 * - If `preferred` is supplied, it must be free (not already used by an
 *   existing entry in `services`). `preferred` may equal 8082 — the caller
 *   is trusted to pass that only when allocating for the auth service.
 * - Otherwise, walk from 8080 upward, skipping any port already used or
 *   the auth-reserved 8082.
 */
export function allocateBackendPort(
  services: readonly ServiceConfig[],
  preferred?: number
): number {
  const taken = collectBackendPorts(services);

  if (preferred !== undefined) {
    if (taken.has(preferred)) {
      throw new PortCollisionError(preferred, 'backend');
    }
    return preferred;
  }

  let candidate = BASE_BACKEND_START;
  while (true) {
    if (candidate === RESERVED_AUTH_BACKEND_PORT) {
      candidate++;
      continue;
    }
    if (!taken.has(candidate)) {
      return candidate;
    }
    candidate++;
    if (candidate > 65535) {
      throw new Error('Exhausted backend port range');
    }
  }
}

/**
 * Pick the next free web port. Reserves 3002 for the auth admin dashboard.
 */
export function allocateWebPort(
  services: readonly ServiceConfig[],
  preferred?: number
): number {
  const taken = collectWebPorts(services);

  if (preferred !== undefined) {
    if (taken.has(preferred)) {
      throw new PortCollisionError(preferred, 'web');
    }
    return preferred;
  }

  let candidate = BASE_WEB_START;
  while (true) {
    if (candidate === RESERVED_AUTH_WEB_PORT) {
      candidate++;
      continue;
    }
    if (!taken.has(candidate)) {
      return candidate;
    }
    candidate++;
    if (candidate > 65535) {
      throw new Error('Exhausted web port range');
    }
  }
}

export const AUTH_BACKEND_PORT = RESERVED_AUTH_BACKEND_PORT;
export const AUTH_WEB_PORT = RESERVED_AUTH_WEB_PORT;

/*
 * +10000 offset applied uniformly to DB, Redis, and app ports in the
 * unified test compose. Leaves headroom for ~1000 services before
 * crossing into ephemeral-port space (linux default `ip_local_port_range`
 * starts at 32768). No collision with dev compose: dev DB host ports are
 * `5432, 5433, …`, dev Redis host ports are `6379, 6380, …`, dev app
 * ports are `8080, 8082, 8081, …` — test equivalents are `15432+`,
 * `16379+`, and `18080+`, disjoint on every axis. If you relocate this
 * offset, existing generated projects' `.env.test` and
 * `docker-compose.test.yml` both hard-code it.
 */
export const TEST_PORT_OFFSET = 10000;

export interface ServiceTestPorts {
  dbPort: number;
  redisPort: number;
  appPort: number;
}

/**
 * Full per-service test-infra record — ports plus the credentials that
 * must land in `.env.test` at generation time (dotenv doesn't expand
 * `${VAR}`, so `.env.test` embeds literal values). Credentials mirror
 * what `writeEnvFilesWithCredentials` publishes into the root `.env`.
 */
export interface ServiceTestInfra extends ServiceTestPorts {
  dbUser: string;
  dbPassword: string;
  dbName: string;
  redisPassword: string;
}

/**
 * Minimum shape `computeTestPorts` needs to walk. Both `ServiceConfig` (the
 * runtime shape) and `ServiceEntry` (the on-disk `stackr.config.json` shape)
 * satisfy it, so callers can pass either without threading a conversion.
 */
interface TestPortsServiceShape {
  name: string;
  backend: { port: number };
}

/**
 * Compute host-port assignments for the test compose. Walks `services` in
 * declaration order and pairs each with a `dbPort` / `redisPort` / `appPort`
 * that is exactly `TEST_PORT_OFFSET` above its dev-compose counterpart.
 *
 * The DB/Redis index walk must match `assignInfraPorts` in
 * `src/generators/docker-compose.ts` (`5432++` / `6379++` in declaration
 * order) so the mapping is deterministic across the two codepaths.
 * `assignInfraPorts` walks `ServiceEntry[]` while this walks a minimal
 * `{ name; backend: { port } }` shape satisfied by both `ServiceConfig` and
 * `ServiceEntry`; both the monorepo generator and `add-service.ts` preserve
 * declaration order when mapping between the two, so the walks stay aligned.
 */
export function computeTestPorts(
  services: readonly TestPortsServiceShape[]
): Record<string, ServiceTestPorts> {
  const out: Record<string, ServiceTestPorts> = {};
  let dbBase = 5432;
  let redisBase = 6379;
  for (const svc of services) {
    out[svc.name] = {
      dbPort: dbBase + TEST_PORT_OFFSET,
      redisPort: redisBase + TEST_PORT_OFFSET,
      appPort: svc.backend.port + TEST_PORT_OFFSET,
    };
    dbBase++;
    redisBase++;
  }
  return out;
}
