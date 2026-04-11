import { auth } from "../../lib/auth";
import { ErrorFactory } from "../../utils/errors";
import type { RevokeSessionResponse } from "./schema";

/**
 * Session Service
 *
 * Business logic that orchestrates repository calls and external services.
 * This file is ORM-agnostic - repository operations are imported from ./repository.
 */

/**
 * Revoke a session using Better Auth's native revocation API
 * This is an external service call, not a database operation
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
    throw ErrorFactory.externalServiceError('BetterAuth', {
      operation: 'revokeSession',
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
};
