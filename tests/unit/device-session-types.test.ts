import { describe, it, expect } from 'vitest';

/**
 * Tests for DeviceSession type guards used in templates.
 * These type guards are duplicated in:
 * - templates/base/web/src/lib/device/types.ts
 * - templates/features/mobile/auth/types/deviceSession.ts
 *
 * Since they're template files (not source code), we test the logic directly.
 */

// Recreate the types and type guards for testing
interface BaseDeviceSession {
  id: string;
  deviceId: string;
  sessionToken: string;
  createdAt: string;
  lastActiveAt: string;
  preferredCurrency: string;
}

interface ActiveDeviceSession extends BaseDeviceSession {
  migrated: false;
  migratedToUserId: null;
}

interface MigratedDeviceSession extends BaseDeviceSession {
  migrated: true;
  migratedToUserId: string;
}

type DeviceSession = ActiveDeviceSession | MigratedDeviceSession;

function isMigratedSession(session: DeviceSession): session is MigratedDeviceSession {
  return session.migrated === true;
}

function isActiveSession(session: DeviceSession): session is ActiveDeviceSession {
  return session.migrated === false;
}

describe('DeviceSession Type Guards', () => {
  const baseSessionFields = {
    id: 'session-123',
    deviceId: 'device-456',
    sessionToken: 'token-789',
    createdAt: '2024-01-01T00:00:00Z',
    lastActiveAt: '2024-01-01T00:00:00Z',
    preferredCurrency: 'USD',
  };

  const activeSession: ActiveDeviceSession = {
    ...baseSessionFields,
    migrated: false,
    migratedToUserId: null,
  };

  const migratedSession: MigratedDeviceSession = {
    ...baseSessionFields,
    migrated: true,
    migratedToUserId: 'user-123',
  };

  describe('isMigratedSession', () => {
    it('should return true for migrated sessions', () => {
      expect(isMigratedSession(migratedSession)).toBe(true);
    });

    it('should return false for active (non-migrated) sessions', () => {
      expect(isMigratedSession(activeSession)).toBe(false);
    });

    it('should properly narrow type to MigratedDeviceSession', () => {
      const session: DeviceSession = migratedSession;
      if (isMigratedSession(session)) {
        // TypeScript should allow accessing migratedToUserId as string
        expect(typeof session.migratedToUserId).toBe('string');
        expect(session.migratedToUserId).toBe('user-123');
      }
    });
  });

  describe('isActiveSession', () => {
    it('should return true for active (non-migrated) sessions', () => {
      expect(isActiveSession(activeSession)).toBe(true);
    });

    it('should return false for migrated sessions', () => {
      expect(isActiveSession(migratedSession)).toBe(false);
    });

    it('should properly narrow type to ActiveDeviceSession', () => {
      const session: DeviceSession = activeSession;
      if (isActiveSession(session)) {
        // TypeScript should allow accessing migratedToUserId as null
        expect(session.migratedToUserId).toBeNull();
        expect(session.migrated).toBe(false);
      }
    });
  });

  describe('type guard mutual exclusivity', () => {
    it('a session cannot be both migrated and active', () => {
      expect(isMigratedSession(migratedSession) && isActiveSession(migratedSession)).toBe(false);
      expect(isMigratedSession(activeSession) && isActiveSession(activeSession)).toBe(false);
    });

    it('a session must be either migrated or active', () => {
      expect(isMigratedSession(migratedSession) || isActiveSession(migratedSession)).toBe(true);
      expect(isMigratedSession(activeSession) || isActiveSession(activeSession)).toBe(true);
    });
  });
});
