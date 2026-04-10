import { eq, lt } from 'drizzle-orm';
import { db, schema } from "../../utils/db";
import { ErrorFactory } from "../../utils/errors";
import { DeviceSession } from "./schema";

/**
 * Device Session Repository (Drizzle)
 *
 * Pure database operations only. Business logic belongs in service.ts.
 */

// Helper to transform Drizzle session to API format
const toDeviceSession = (session: {
  id: string;
  deviceId: string;
  sessionToken: string;
  createdAt: Date;
  lastActiveAt: Date;
  migrated: boolean;
  migratedToUserId: string | null;
  preferredCurrency: string;
}): DeviceSession => ({
  ...session,
  createdAt: session.createdAt.toISOString(),
  lastActiveAt: session.lastActiveAt.toISOString(),
});

/**
 * Find a device session by token (pure fetch, no expiration logic)
 */
export const findDeviceSessionByToken = async (sessionToken: string): Promise<DeviceSession | null> => {
  try {
    const [session] = await db
      .select()
      .from(schema.deviceSession)
      .where(eq(schema.deviceSession.sessionToken, sessionToken))
      .limit(1);

    return session ? toDeviceSession(session) : null;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'findDeviceSessionByToken',
      sessionToken,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Find a device session by ID (pure fetch)
 */
export const getDeviceSessionById = async (sessionId: string): Promise<DeviceSession | null> => {
  try {
    const [session] = await db
      .select()
      .from(schema.deviceSession)
      .where(eq(schema.deviceSession.id, sessionId))
      .limit(1);

    return session ? toDeviceSession(session) : null;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'getDeviceSessionById',
      sessionId,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Insert a new device session (pure insert with all fields provided)
 */
export const insertDeviceSession = async (data: {
  deviceId: string;
  sessionToken: string;
  preferredCurrency: string;
  migrated: boolean;
  lastActiveAt: Date;
}): Promise<DeviceSession> => {
  try {
    const [session] = await db
      .insert(schema.deviceSession)
      .values({
        deviceId: data.deviceId,
        sessionToken: data.sessionToken,
        preferredCurrency: data.preferredCurrency,
        migrated: data.migrated,
        lastActiveAt: data.lastActiveAt,
      })
      .returning();

    return toDeviceSession(session);
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'insertDeviceSession',
      deviceId: data.deviceId,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Update device session activity timestamp (pure DB update)
 */
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

/**
 * Delete a device session by token (pure DB delete)
 */
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

/**
 * Delete expired device sessions (pure batch delete with provided threshold)
 */
export const deleteExpiredDeviceSessions = async (threshold: Date): Promise<number> => {
  try {
    const result = await db
      .delete(schema.deviceSession)
      .where(lt(schema.deviceSession.lastActiveAt, threshold))
      .returning({ id: schema.deviceSession.id });

    return result.length;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'deleteExpiredDeviceSessions',
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Migrate a device session to a user account (pure DB update)
 */
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
