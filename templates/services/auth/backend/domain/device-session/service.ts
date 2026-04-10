import {
  findDeviceSessionByToken,
  insertDeviceSession,
  deleteDeviceSession,
  deleteExpiredDeviceSessions,
} from "./repository";
import {
  DeviceSession,
  CreateDeviceSessionBody,
  CreateDeviceSessionResponse,
  DeviceSessionMigrationEligibilityResponse,
} from "./schema";

/**
 * Device Session Service
 *
 * Business logic that orchestrates repository calls.
 * This file is ORM-agnostic - it imports from ./repository which resolves
 * to the correct implementation (Prisma or Drizzle) at generation time.
 */

// Generate a UUID v4 for session tokens
const generateSessionToken = (): string => {
  return crypto.randomUUID();
};

// Session expiration threshold (30 days of inactivity)
const EXPIRATION_DAYS = 30;

const getExpirationThreshold = (): Date => {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - EXPIRATION_DAYS);
  return threshold;
};

/**
 * Create a new device session with generated token and default values
 */
export const createDeviceSession = async (
  data: CreateDeviceSessionBody
): Promise<CreateDeviceSessionResponse> => {
  const { deviceId } = data;
  const sessionToken = generateSessionToken();

  const session = await insertDeviceSession({
    deviceId,
    sessionToken,
    preferredCurrency: 'USD',
    migrated: false,
    lastActiveAt: new Date(),
  });

  return {
    session,
    sessionToken,
  };
};

/**
 * Validate a device session - checks existence and expiration (30 days)
 * Deletes expired sessions automatically
 */
export const validateDeviceSession = async (
  sessionToken: string
): Promise<DeviceSession | null> => {
  const session = await findDeviceSessionByToken(sessionToken);

  if (!session) {
    return null;
  }

  // Check if session is expired (30 days of inactivity)
  const threshold = getExpirationThreshold();
  const lastActive = new Date(session.lastActiveAt);

  if (lastActive < threshold) {
    // Session expired, delete it
    await deleteDeviceSession(sessionToken);
    return null;
  }

  return session;
};

/**
 * Check if a device session is eligible for migration to a user account
 */
export const validateDeviceSessionMigrationEligibility = async (
  sessionToken: string
): Promise<DeviceSessionMigrationEligibilityResponse> => {
  const session = await validateDeviceSession(sessionToken);

  if (!session) {
    return {
      canMigrate: false,
      reason: 'Device session not found or expired',
    };
  }

  if (session.migrated) {
    return {
      canMigrate: false,
      reason: 'Device session already migrated to user account',
    };
  }

  return {
    canMigrate: true,
  };
};

/**
 * Clean up expired device sessions (older than 30 days)
 * Returns the number of deleted sessions
 */
export const cleanupExpiredDeviceSessions = async (): Promise<number> => {
  const threshold = getExpirationThreshold();
  return deleteExpiredDeviceSessions(threshold);
};

/**
 * Get a device session by token (validates and returns if valid)
 * Alias for validateDeviceSession for semantic clarity
 */
export const getDeviceSessionByToken = async (
  sessionToken: string
): Promise<DeviceSession | null> => {
  return validateDeviceSession(sessionToken);
};
