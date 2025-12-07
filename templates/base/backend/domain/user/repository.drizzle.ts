import { eq } from 'drizzle-orm';
import { db, schema } from "../../utils/db";
import { ErrorFactory } from "../../utils/errors";

/**
 * User Repository (Drizzle)
 *
 * Note: User creation and authentication is handled by BetterAuth.
 * This repository provides helper functions for user lookups and profile updates.
 */

export const getUser = async (id: string) => {
  try {
    const [user] = await db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        name: schema.user.name,
        image: schema.user.image,
        createdAt: schema.user.createdAt,
        updatedAt: schema.user.updatedAt,
      })
      .from(schema.user)
      .where(eq(schema.user.id, id))
      .limit(1);

    return user || null;
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
    const [user] = await db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        name: schema.user.name,
        image: schema.user.image,
        createdAt: schema.user.createdAt,
        updatedAt: schema.user.updatedAt,
      })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);

    return user || null;
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
    const [result] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1);

    return !!result;
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
    const [user] = await db
      .update(schema.user)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(schema.user.id, userId))
      .returning({
        id: schema.user.id,
        email: schema.user.email,
        emailVerified: schema.user.emailVerified,
        name: schema.user.name,
        image: schema.user.image,
        createdAt: schema.user.createdAt,
        updatedAt: schema.user.updatedAt,
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
    await db
      .delete(schema.user)
      .where(eq(schema.user.id, userId));
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'deleteUser',
      userId,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};
