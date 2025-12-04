import { Static, Type } from "@sinclair/typebox";

// User schema matching BetterAuth's user model
export const UserSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  emailVerified: Type.Boolean(),
  name: Type.Union([Type.String(), Type.Null()]),
  image: Type.Union([Type.String(), Type.Null()]),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export type User = Static<typeof UserSchema>;