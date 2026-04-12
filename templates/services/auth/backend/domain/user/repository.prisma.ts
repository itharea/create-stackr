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

export const listUsers = async (params?: { search?: string; role?: string }) => {
  try {
    const where: Record<string, unknown> = {};
    if (params?.role) {
      where.role = params.role;
    }
    if (params?.search) {
      where.OR = [
        { email: { contains: params.search, mode: "insensitive" } },
        { name: { contains: params.search, mode: "insensitive" } },
      ];
    }

    return await db.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'listUsers',
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getUserWithRole = async (id: string) => {
  try {
    return await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'getUserWithRole',
      userId: id,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const updateUserRole = async (userId: string, role: string) => {
  try {
    return await db.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, role: true },
    });
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'updateUserRole',
      userId,
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

export const createAdminUser = async (data: {
  email: string;
  name: string;
  hashedPassword: string;
}) => {
  try {
    await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          name: data.name,
          role: "admin",
          emailVerified: true,
        },
      });

      await tx.account.create({
        data: {
          userId: user.id,
          accountId: user.id,
          providerId: "credential",
          password: data.hashedPassword,
        },
      });
    });
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'createAdminUser',
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