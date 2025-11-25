import { Static, Type } from "@sinclair/typebox";

// Register schemas
export const RegisterBodySchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 50 }),
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 6 }),
  passwordConfirmation: Type.String({ minLength: 6 }),
});

export type RegisterBody = Static<typeof RegisterBodySchema>;

export const RegisterResponseSchema = Type.Object({
  user: Type.Object({
    id: Type.String(),
    email: Type.String(),
    name: Type.String(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  }),
  token: Type.String(),
});

export type RegisterResponse = Static<typeof RegisterResponseSchema>;

// Login schemas
export const LoginBodySchema = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 1 }),
});

export type LoginBody = Static<typeof LoginBodySchema>;

export const LoginResponseSchema = Type.Object({
  user: Type.Object({
    id: Type.String(),
    email: Type.String(),
    name: Type.String(),
    createdAt: Type.String({ format: 'date-time' }),
    updatedAt: Type.String({ format: 'date-time' }),
  }),
  token: Type.String(),
});

export type LoginResponse = Static<typeof LoginResponseSchema>;

// Update profile schemas
export const UpdateProfileBodySchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
  email: Type.Optional(Type.String({ format: "email" })),
});

export type UpdateProfileBody = Static<typeof UpdateProfileBodySchema>;

export const UpdateProfileResponseSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
  createdAt: Type.String({ format: 'date-time' }),
  updatedAt: Type.String({ format: 'date-time' }),
});

export type UpdateProfileResponse = Static<typeof UpdateProfileResponseSchema>;

// Change password schemas
export const ChangePasswordBodySchema = Type.Object({
  currentPassword: Type.String({ minLength: 1 }),
  newPassword: Type.String({ minLength: 6 }),
});

export type ChangePasswordBody = Static<typeof ChangePasswordBodySchema>;