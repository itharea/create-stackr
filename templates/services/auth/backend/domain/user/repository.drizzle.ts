import { eq, and, or, ilike } from 'drizzle-orm';
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

export const listUsers = async (params?: { search?: string; role?: string }) => {
  try {
    const conditions = [];
    if (params?.role) {
      conditions.push(eq(schema.user.role, params.role));
    }
    if (params?.search) {
      const pattern = `%${params.search}%`;
      conditions.push(
        or(
          ilike(schema.user.email, pattern),
          ilike(schema.user.name, pattern)
        )!
      );
    }

    return await db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        name: schema.user.name,
        role: schema.user.role,
        emailVerified: schema.user.emailVerified,
        image: schema.user.image,
        createdAt: schema.user.createdAt,
        updatedAt: schema.user.updatedAt,
      })
      .from(schema.user)
      .where(conditions.length > 0 ? and(...conditions) : undefined);
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'listUsers',
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getUserWithRole = async (id: string) => {
  try {
    const [user] = await db
      .select({
        id: schema.user.id,
        email: schema.user.email,
        name: schema.user.name,
        role: schema.user.role,
        emailVerified: schema.user.emailVerified,
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
      operation: 'getUserWithRole',
      userId: id,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const updateUserRole = async (userId: string, role: string) => {
  try {
    const [updated] = await db
      .update(schema.user)
      .set({ role, updatedAt: new Date() })
      .where(eq(schema.user.id, userId))
      .returning({ id: schema.user.id, role: schema.user.role });

    return updated || null;
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

export const createAdminUser = async (data: {
  email: string;
  name: string;
  hashedPassword: string;
}) => {
  try {
    await db.transaction(async (tx) => {
      const [user] = await tx.insert(schema.user).values({
        email: data.email,
        name: data.name,
        role: "admin",
        emailVerified: true,
      }).returning({ id: schema.user.id });

      await tx.insert(schema.account).values({
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: data.hashedPassword,
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
    const [credentialAccount] = await db
      .select({ password: schema.account.password })
      .from(schema.account)
      .where(
        and(
          eq(schema.account.userId, userId),
          eq(schema.account.providerId, 'credential')
        )
      )
      .limit(1);

    return !!credentialAccount?.password;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'userHasPassword',
      userId,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};
