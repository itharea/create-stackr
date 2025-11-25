import { Static, Type } from "@sinclair/typebox";

export const UserSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export type User = Static<typeof UserSchema>;