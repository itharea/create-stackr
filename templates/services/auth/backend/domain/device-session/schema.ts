import { Static, Type } from "@sinclair/typebox";

// Core DeviceSession entity schema (anonymous device sessions before authentication)
export const DeviceSessionSchema = Type.Object({
  id: Type.String(),
  deviceId: Type.String(),
  sessionToken: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  lastActiveAt: Type.String({ format: 'date-time' }),
  migrated: Type.Boolean(),
  migratedToUserId: Type.Optional(Type.Union([Type.String(), Type.Null()])),
  preferredCurrency: Type.String({ default: 'USD' }),
});

export type DeviceSession = Static<typeof DeviceSessionSchema>;

// Create device session request schema
export const CreateDeviceSessionBodySchema = Type.Object({
  deviceId: Type.String({
    minLength: 1,
    maxLength: 128,
    pattern: "^[a-zA-Z0-9_-]+$" // Allow alphanumeric, underscore, and hyphen
  }),
});

export type CreateDeviceSessionBody = Static<typeof CreateDeviceSessionBodySchema>;

// Create device session response schema
export const CreateDeviceSessionResponseSchema = Type.Object({
  session: DeviceSessionSchema,
  sessionToken: Type.String(),
});

export type CreateDeviceSessionResponse = Static<typeof CreateDeviceSessionResponseSchema>;

// Validate device session request schema (for session token validation)
export const ValidateDeviceSessionBodySchema = Type.Object({
  sessionToken: Type.String({
    minLength: 36,
    maxLength: 36,
    pattern: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$" // UUID format
  }),
});

export type ValidateDeviceSessionBody = Static<typeof ValidateDeviceSessionBodySchema>;

// Device session validation response schema
export const DeviceSessionValidationResponseSchema = Type.Object({
  valid: Type.Boolean(),
  session: Type.Optional(DeviceSessionSchema),
});

export type DeviceSessionValidationResponse = Static<typeof DeviceSessionValidationResponseSchema>;

// Update device session activity request schema
export const UpdateDeviceSessionActivityBodySchema = Type.Object({
  sessionToken: Type.String({
    minLength: 36,
    maxLength: 36,
    pattern: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
  }),
});

export type UpdateDeviceSessionActivityBody = Static<typeof UpdateDeviceSessionActivityBodySchema>;

// Device session migration eligibility response schema
export const DeviceSessionMigrationEligibilityResponseSchema = Type.Object({
  canMigrate: Type.Boolean(),
  reason: Type.Optional(Type.String()),
});

export type DeviceSessionMigrationEligibilityResponse = Static<typeof DeviceSessionMigrationEligibilityResponseSchema>;
