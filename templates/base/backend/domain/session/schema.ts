import { Type, Static } from '@sinclair/typebox';

/**
 * Session Domain Schema
 *
 * Schemas for BFF session operations (session management from web frontend).
 * Note: Session creation/authentication is handled by BetterAuth.
 */

// Session with token (used internally for revocation)
export const SessionWithTokenSchema = Type.Object({
  id: Type.String(),
  userId: Type.String(),
  token: Type.String(),
  expiresAt: Type.String({ format: 'date-time' }),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
  ipAddress: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  userAgent: Type.Optional(Type.Union([Type.String(), Type.Null()])),
});

export type SessionWithToken = Static<typeof SessionWithTokenSchema>;

// Revoke session response
export const RevokeSessionResponseSchema = Type.Object({
  status: Type.Boolean(),
});

export type RevokeSessionResponse = Static<typeof RevokeSessionResponseSchema>;
