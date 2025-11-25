import { Static, Type } from "@sinclair/typebox";

// Core Session entity schema
export const SessionSchema = Type.Object({
  id: Type.String(),
  deviceId: Type.String(),
  sessionToken: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  lastActiveAt: Type.String({ format: 'date-time' }),
  migrated: Type.Boolean(),
  migratedToUserId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  preferredCurrency: Type.String({ default: 'USD' }),
});

export type Session = Static<typeof SessionSchema>;

// Create session request schema
export const CreateSessionBodySchema = Type.Object({
  deviceId: Type.String({ 
    minLength: 1, 
    maxLength: 128,
    pattern: "^[a-zA-Z0-9_-]+$" // Allow alphanumeric, underscore, and hyphen
  }),
});

export type CreateSessionBody = Static<typeof CreateSessionBodySchema>;

// Create session response schema
export const CreateSessionResponseSchema = Type.Object({
  session: SessionSchema,
  sessionToken: Type.String(),
});

export type CreateSessionResponse = Static<typeof CreateSessionResponseSchema>;

// Validate session request schema (for session token validation)
export const ValidateSessionBodySchema = Type.Object({
  sessionToken: Type.String({ 
    minLength: 36, 
    maxLength: 36,
    pattern: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$" // UUID format
  }),
});

export type ValidateSessionBody = Static<typeof ValidateSessionBodySchema>;

// Session validation response schema
export const SessionValidationResponseSchema = Type.Object({
  valid: Type.Boolean(),
  session: Type.Optional(SessionSchema),
});

export type SessionValidationResponse = Static<typeof SessionValidationResponseSchema>;

// Update session activity request schema
export const UpdateSessionActivityBodySchema = Type.Object({
  sessionToken: Type.String({ 
    minLength: 36, 
    maxLength: 36,
    pattern: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
  }),
});

export type UpdateSessionActivityBody = Static<typeof UpdateSessionActivityBodySchema>;

// Session migration request schema (for migrating session to user account)
export const MigrateSessionBodySchema = Type.Object({
  sessionToken: Type.String({ 
    minLength: 36, 
    maxLength: 36,
    pattern: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
  }),
  name: Type.String({ minLength: 1, maxLength: 50 }),
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 6 }),
  passwordConfirmation: Type.String({ minLength: 6 }),
});

export type MigrateSessionBody = Static<typeof MigrateSessionBodySchema>;

// Session migration response schema
export const MigrateSessionResponseSchema = Type.Object({
  user: Type.Object({
    id: Type.String(),
    email: Type.String(),
    name: Type.String(),
    preferredCurrency: Type.String(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  }),
  token: Type.String(),
});

export type MigrateSessionResponse = Static<typeof MigrateSessionResponseSchema>;

// Migration eligibility response schema
export const MigrationEligibilityResponseSchema = Type.Object({
  canMigrate: Type.Boolean(),
  reason: Type.Optional(Type.String()),
});

export type MigrationEligibilityResponse = Static<typeof MigrationEligibilityResponseSchema>;

