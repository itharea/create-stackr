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

    it('returns 8081 when only auth (8082) exists', () => {
      expect(allocateBackendPort([svc('auth', 8082)])).toBe(8080);
    });

    it('skips 8082 when auto-allocating around auth', () => {
      const services = [svc('auth', 8082), svc('a', 8080), svc('b', 8081)];
      expect(allocateBackendPort(services)).toBe(8083);
    });

    it('returns the next free port after existing services', () => {
      const services = [svc('a', 8080), svc('b', 8081)];
      expect(allocateBackendPort(services)).toBe(8083); // skipping 8082
    });

    it('honors an explicit preferred port', () => {
      expect(allocateBackendPort([], 9090)).toBe(9090);
    });

    it('throws PortCollisionError when preferred is taken', () => {
      expect(() => allocateBackendPort([svc('a', 9090)], 9090)).toThrow(PortCollisionError);
    });

    it('AUTH_BACKEND_PORT constant equals 8082', () => {
      expect(AUTH_BACKEND_PORT).toBe(8082);
    });
  });

  describe('allocateWebPort', () => {
    it('returns 3000 when no web services exist', () => {
      expect(allocateWebPort([])).toBe(3000);
    });

    it('skips 3002 (reserved for auth web admin)', () => {
      const services = [svc('a', 8080, 3000), svc('b', 8081, 3001)];
      expect(allocateWebPort(services)).toBe(3003);
    });

    it('AUTH_WEB_PORT constant equals 3002', () => {
      expect(AUTH_WEB_PORT).toBe(3002);
    });
  });
});
