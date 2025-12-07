import { db } from "../../utils/db";
import { ErrorFactory } from "../../utils/errors";
import {
  DeviceSession,
  CreateDeviceSessionBody,
  CreateDeviceSessionResponse,
  DeviceSessionMigrationEligibilityResponse,
} from "./schema";

// Generate a UUID v4 for session tokens
const generateSessionToken = (): string => {
  return crypto.randomUUID();
};

export const createDeviceSession = async (data: CreateDeviceSessionBody): Promise<CreateDeviceSessionResponse> => {
  const { deviceId } = data;

  try {
    const sessionToken = generateSessionToken();

    const session = await db.deviceSession.create({
      data: {
        deviceId,
        sessionToken,
        preferredCurrency: 'USD',
        migrated: false,
        lastActiveAt: new Date(),
      },
      select: {
        id: true,
        deviceId: true,
        sessionToken: true,
        createdAt: true,
        lastActiveAt: true,
        migrated: true,
        migratedToUserId: true,
        preferredCurrency: true,
      },
    });

    return {
      session: {
        ...session,
        createdAt: session.createdAt.toISOString(),
        lastActiveAt: session.lastActiveAt.toISOString(),
      },
      sessionToken,
    };
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'createDeviceSession',
      deviceId,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const validateDeviceSession = async (sessionToken: string): Promise<DeviceSession | null> => {
  try {
    const session = await db.deviceSession.findUnique({
      where: { sessionToken },
      select: {
        id: true,
        deviceId: true,
        sessionToken: true,
        createdAt: true,
        lastActiveAt: true,
        migrated: true,
        migratedToUserId: true,
        preferredCurrency: true,
      },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired (30 days of inactivity)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (session.lastActiveAt < thirtyDaysAgo) {
      // Session expired, delete it
      await deleteDeviceSession(sessionToken);
      return null;
    }

    return {
      ...session,
      createdAt: session.createdAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
    };
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'validateDeviceSession',
      sessionToken,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const updateDeviceSessionActivity = async (sessionToken: string): Promise<void> => {
  try {
    await db.deviceSession.update({
      where: { sessionToken },
      data: { lastActiveAt: new Date() },
    });
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'updateDeviceSessionActivity',
      sessionToken,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const deleteDeviceSession = async (sessionToken: string): Promise<void> => {
  try {
    await db.deviceSession.delete({
      where: { sessionToken },
    });
  } catch (error) {
    // Don't throw error if session doesn't exist
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return;
    }

    throw ErrorFactory.databaseError({
      operation: 'deleteDeviceSession',
      sessionToken,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const validateDeviceSessionMigrationEligibility = async (sessionToken: string): Promise<DeviceSessionMigrationEligibilityResponse> => {
  try {
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
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'validateDeviceSessionMigrationEligibility',
      sessionToken,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Migrate a device session to a user account
 * This is called after a user signs up through BetterAuth to link their device session
 */
export const migrateDeviceSessionToUser = async (sessionToken: string, userId: string): Promise<void> => {
  try {
    await db.deviceSession.update({
      where: { sessionToken },
      data: {
        migrated: true,
        migratedToUserId: userId,
      },
    });
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'migrateDeviceSessionToUser',
      sessionToken,
      userId,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const cleanupExpiredDeviceSessions = async (): Promise<number> => {
  try {
    // Delete sessions older than 30 days of inactivity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db.deviceSession.deleteMany({
      where: {
        lastActiveAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    return result.count;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'cleanupExpiredDeviceSessions',
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getDeviceSessionById = async (sessionId: string): Promise<DeviceSession | null> => {
  try {
    const session = await db.deviceSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        deviceId: true,
        sessionToken: true,
        createdAt: true,
        lastActiveAt: true,
        migrated: true,
        migratedToUserId: true,
        preferredCurrency: true,
      },
    });

    if (!session) {
      return null;
    }

    return {
      ...session,
      createdAt: session.createdAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
    };
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'getDeviceSessionById',
      sessionId,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getDeviceSessionByToken = async (sessionToken: string): Promise<DeviceSession | null> => {
  return validateDeviceSession(sessionToken);
};
