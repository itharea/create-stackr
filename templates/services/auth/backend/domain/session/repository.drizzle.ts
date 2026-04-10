import { eq, and } from 'drizzle-orm';
import { db, schema } from "../../utils/db";
import { ErrorFactory } from "../../utils/errors";
import type { SessionWithToken } from "./schema";

/**
 * Session Repository (Drizzle)
 *
 * Pure database operations only. Business logic belongs in service.ts.
 * Note: Session creation/authentication is handled by BetterAuth.
 */

/**
 * Find a session by ID that belongs to the specified user
 */
export const findUserSessionById = async (
  sessionId: string,
  userId: string
): Promise<SessionWithToken | null> => {
  try {
    const [session] = await db
      .select()
      .from(schema.session)
      .where(and(eq(schema.session.id, sessionId), eq(schema.session.userId, userId)))
      .limit(1);

    if (!session) {
      return null;
    }

    return {
      id: session.id,
      userId: session.userId,
      token: session.token,
      expiresAt: session.expiresAt.toISOString(),
      createdAt: session.createdAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
    };
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'findUserSessionById',
      sessionId,
      userId,
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
};
