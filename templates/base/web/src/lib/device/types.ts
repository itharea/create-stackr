// Base session properties shared by all states
interface BaseDeviceSession {
  id: string;
  deviceId: string;
  sessionToken: string;
  createdAt: string;
  lastActiveAt: string;
  preferredCurrency: string;
}

// Active (non-migrated) session
interface ActiveDeviceSession extends BaseDeviceSession {
  migrated: false;
  migratedToUserId: null;
}

// Migrated session (device was linked to a user account)
interface MigratedDeviceSession extends BaseDeviceSession {
  migrated: true;
  migratedToUserId: string;
}

// Discriminated union - TypeScript will narrow based on `migrated` field
export type DeviceSession = ActiveDeviceSession | MigratedDeviceSession;

// Type guards for explicit narrowing when needed
export function isMigratedSession(
  session: DeviceSession
): session is MigratedDeviceSession {
  return session.migrated === true;
}

export function isActiveSession(
  session: DeviceSession
): session is ActiveDeviceSession {
  return session.migrated === false;
}
