import bcrypt from "bcrypt";

import { LoginBody, LoginResponse, RegisterBody, RegisterResponse } from "./schema";
import jwt from "../../utils/jwt";
import { createUser, findUserByEmailWithPassword, getUser, updateUserProfile, updateUserPassword } from "../user/repository";
import { User } from "@prisma/client";
import { ErrorFactory } from "../../utils/errors";

export const registerUser = async ({
  name, 
  email,
  password,
  passwordConfirmation
} : RegisterBody) : Promise<RegisterResponse> => {
 
  // Validate password match
  if (password !== passwordConfirmation) {
    throw ErrorFactory.validationFailed({
      field: 'passwordConfirmation',
      message: 'Passwords do not match'
    });
  }

  // Validate password length
  if (password.length < 6) {
    throw ErrorFactory.validationFailed({
      field: 'password',
      message: 'Password must be at least 6 characters long'
    });
  }
 
  let hashedPassword;
  try {
    hashedPassword = await bcrypt.hash(password, 10);
  } catch (error) {
    throw ErrorFactory.internalServerError({
      operation: 'hashPassword',
      originalError: error instanceof Error ? error.message : String(error)
    });
  }

  const user = await createUser(email, hashedPassword, name);

  let token;
  try {
    token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      }, 
      {expiresIn: "24h"}
    );
  } catch (error) {
    throw ErrorFactory.internalServerError({
      operation: 'generateToken',
      originalError: error instanceof Error ? error.message : String(error)
    });
  }

  return {
    user: {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    token,
  };
};

export const loginUser = async ({
  email,
  password,
} : LoginBody): Promise<LoginResponse> => {

  const user = await findUserByEmailWithPassword(email);
  
  if (!user) {
    throw ErrorFactory.invalidCredentials();
  }

  let authenticated;
  try {
     authenticated = await bcrypt.compare(password, user.password);
  } catch (error) {
    throw ErrorFactory.internalServerError({
      operation: 'comparePassword',
      originalError: error instanceof Error ? error.message : String(error)
    });
  }

  if (!authenticated) {
    throw ErrorFactory.invalidCredentials();
  }

  let token;
  try {
    token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      { expiresIn: "24h" }
    );
  } catch (error) {
    throw ErrorFactory.internalServerError({
      operation: 'generateLoginToken',
      originalError: error instanceof Error ? error.message : String(error)
    });
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    },
    token,
  }; 
};

export const updateUser = async (
  userId: string,
  data: { name?: string; email?: string }
) => {
  return await updateUserProfile(userId, data);
};

export const changePassword = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  // Get user to verify current password
  const user = await getUser(userId);
  
  if (!user) {
    throw ErrorFactory.userNotFound();
  }

  // We need to get the user with password for verification
  const userWithPassword = await findUserByEmailWithPassword(user.email);
  
  if (!userWithPassword) {
    throw ErrorFactory.userNotFound();
  }
  
  // Verify current password
  let isCurrentPasswordValid;
  try {
    isCurrentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password);
  } catch (error) {
    throw ErrorFactory.internalServerError({
      operation: 'compareCurrentPassword',
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
  
  if (!isCurrentPasswordValid) {
    throw ErrorFactory.validationFailed({
      field: 'currentPassword',
      message: 'Current password is incorrect'
    });
  }

  // Validate new password
  if (newPassword.length < 6) {
    throw ErrorFactory.validationFailed({
      field: 'newPassword',
      message: 'New password must be at least 6 characters long'
    });
  }

  // Hash new password
  let hashedNewPassword;
  try {
    hashedNewPassword = await bcrypt.hash(newPassword, 10);
  } catch (error) {
    throw ErrorFactory.internalServerError({
      operation: 'hashNewPassword',
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
  
  // Update password
  await updateUserPassword(userId, hashedNewPassword);
};