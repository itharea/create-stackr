import { db } from "../../utils/db";
import { auth } from "../../lib/auth";
import { ErrorFactory } from "../../utils/errors";
import type { SessionWithToken, RevokeSessionResponse } from "./schema";

/**
 * Session Repository (Prisma)
 *
 * Provides session management operations for the BFF pattern.
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
    const session = await db.session.findFirst({
      where: {
        id: sessionId,
        userId: userId,
      },
    });

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

/**
 * Revoke a session using Better Auth's native revocation
 */
export const revokeSessionByToken = async (
  token: string,
  headers: Headers
): Promise<RevokeSessionResponse> => {
  try {
    const response = await auth.api.revokeSession({
      headers,
      body: { token },
    });

    return response as RevokeSessionResponse;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'revokeSessionByToken',
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
};
