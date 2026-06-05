import { describe, it, expect } from 'vitest';
import {
  allocateBackendPort,
  allocateWebPort,
  PortCollisionError,
  AUTH_BACKEND_PORT,
  AUTH_WEB_PORT,
} from '../../src/utils/port-allocator.js';
import type { ServiceConfig } from '../../src/types/index.js';
import { coreEntry } from '../../src/config/presets.js';

function svc(name: string, port: number, webPort?: number): ServiceConfig {
  return coreEntry({
    name,
    backend: { port, eventQueue: false, imageUploads: false, authMiddleware: 'none' },
    web: webPort !== undefined ? { enabled: true, port: webPort } : null,
  });
}

describe('port-allocator', () => {
  describe('allocateBackendPort', () => {
    it('returns 8080 when no services exist', () => {
      expect(allocateBackendPort([])).toBe(8080);
    });

    it('returns 8080 when only the auth service (8888) exists', () => {
      expect(allocateBackendPort([svc('auth', AUTH_BACKEND_PORT)])).toBe(8080);
    });

    it('allocates contiguously around auth (8888 is out of the base range)', () => {
      const services = [svc('auth', AUTH_BACKEND_PORT), svc('a', 8080), svc('b', 8081)];
      expect(allocateBackendPort(services)).toBe(8082);
    });

    it('returns the next free port after existing services (8082 is no longer reserved)', () => {
      const services = [svc('a', 8080), svc('b', 8081)];
      expect(allocateBackendPort(services)).toBe(8082);
    });

    it('honors an explicit preferred port', () => {
      expect(allocateBackendPort([], 9090)).toBe(9090);
    });

    it('throws PortCollisionError when preferred is taken', () => {
      expect(() => allocateBackendPort([svc('a', 9090)], 9090)).toThrow(PortCollisionError);
    });

    it('AUTH_BACKEND_PORT constant equals 8888', () => {
      expect(AUTH_BACKEND_PORT).toBe(8888);
    });
  });

  describe('allocateWebPort', () => {
    it('returns 3000 when no web services exist', () => {
      expect(allocateWebPort([])).toBe(3000);
    });

    it('allocates web ports contiguously (3002 is no longer reserved)', () => {
      const services = [svc('a', 8080, 3000), svc('b', 8081, 3001)];
      expect(allocateWebPort(services)).toBe(3002);
    });

    it('AUTH_WEB_PORT constant equals 3333', () => {
      expect(AUTH_WEB_PORT).toBe(3333);
    });
  });

  describe('determinism (phase 3)', () => {
    it('allocating a new port against the same config twice yields the same result', () => {
      const services = [svc('auth', AUTH_BACKEND_PORT), svc('core', 8080), svc('scout', 8081)];
      const first = allocateBackendPort(services);
      const second = allocateBackendPort(services);
      expect(first).toBe(second);
      expect(first).toBe(8082);
    });

    it('allocating after differently-ordered inputs yields the same next port', () => {
      const servicesA = [svc('core', 8080), svc('auth', AUTH_BACKEND_PORT), svc('scout', 8081)];
      const servicesB = [svc('auth', AUTH_BACKEND_PORT), svc('scout', 8081), svc('core', 8080)];
      // Base fills 8080, 8081 (auth at 8888 is out of range) — next free is 8082 in both.
      expect(allocateBackendPort(servicesA)).toBe(allocateBackendPort(servicesB));
    });

    it('web port allocation is deterministic across identical configs', () => {
      const services = [svc('a', 8080, 3000), svc('b', 8081, 3001)];
      expect(allocateWebPort(services)).toBe(allocateWebPort(services));
    });
  });
});
