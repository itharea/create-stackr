import { eq, lt } from 'drizzle-orm';
import { db, schema } from "../../utils/db";
import { ErrorFactory } from "../../utils/errors";
import {
  DeviceSession,
  CreateDeviceSessionBody,
  CreateDeviceSessionResponse,
  DeviceSessionMigrationEligibilityResponse,
} from "./schema";

const generateSessionToken = (): string => {
  return crypto.randomUUID();
};

export const createDeviceSession = async (data: CreateDeviceSessionBody): Promise<CreateDeviceSessionResponse> => {
  const { deviceId } = data;

  try {
    const sessionToken = generateSessionToken();

    const [session] = await db
      .insert(schema.deviceSession)
      .values({
        deviceId,
        sessionToken,
        preferredCurrency: 'USD',
        migrated: false,
        lastActiveAt: new Date(),
      })
      .returning();

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
    const [session] = await db
      .select()
      .from(schema.deviceSession)
      .where(eq(schema.deviceSession.sessionToken, sessionToken))
      .limit(1);

    if (!session) {
      return null;
    }

    // Check if session is expired (30 days of inactivity)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    if (session.lastActiveAt < thirtyDaysAgo) {
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
    await db
      .update(schema.deviceSession)
      .set({ lastActiveAt: new Date() })
      .where(eq(schema.deviceSession.sessionToken, sessionToken));
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
    await db
      .delete(schema.deviceSession)
      .where(eq(schema.deviceSession.sessionToken, sessionToken));
  } catch (error) {
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

export const migrateDeviceSessionToUser = async (sessionToken: string, userId: string): Promise<void> => {
  try {
    await db
      .update(schema.deviceSession)
      .set({
        migrated: true,
        migratedToUserId: userId,
      })
      .where(eq(schema.deviceSession.sessionToken, sessionToken));
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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db
      .delete(schema.deviceSession)
      .where(lt(schema.deviceSession.lastActiveAt, thirtyDaysAgo))
      .returning({ id: schema.deviceSession.id });

    return result.length;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'cleanupExpiredDeviceSessions',
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getDeviceSessionById = async (sessionId: string): Promise<DeviceSession | null> => {
  try {
    const [session] = await db
      .select()
      .from(schema.deviceSession)
      .where(eq(schema.deviceSession.id, sessionId))
      .limit(1);

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
