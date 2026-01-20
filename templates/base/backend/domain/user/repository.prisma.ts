import { db } from "../../utils/db";
import { ErrorFactory } from "../../utils/errors";

/**
 * User Repository
 *
 * Note: User creation and authentication is handled by BetterAuth.
 * This repository provides helper functions for user lookups and profile updates.
 */

export const getUser = async (id: string) => {
  try {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'getUser',
      userId: id,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getUserByEmail = async (email: string) => {
  try {
    const user = await db.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'getUserByEmail',
      email,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const isUserExistByEmail = async (email: string): Promise<boolean> => {
  try {
    const userCount = await db.user.count({
      where: { email },
    });
    return userCount > 0;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'isUserExistByEmail',
      email,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const updateUserProfile = async (
  userId: string,
  data: { name?: string }
) => {
  try {
    const user = await db.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'updateUserProfile',
      userId,
      updateData: data,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    await db.user.delete({
      where: { id: userId },
    });
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'deleteUser',
      userId,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

/**
 * Check if user has a credential account with password
 * Returns true if user signed up with email/password, false for OAuth-only users
 */
export const userHasPassword = async (userId: string): Promise<boolean> => {
  try {
    const credentialAccount = await db.account.findFirst({
      where: {
        userId,
        providerId: 'credential',
        password: { not: null },
      },
      select: { password: true },
    });

    return !!credentialAccount?.password;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'userHasPassword',
      userId,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};