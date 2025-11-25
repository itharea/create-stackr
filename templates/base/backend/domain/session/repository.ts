import { db } from "../../utils/db";
import { ErrorFactory } from "../../utils/errors";
import {
  Session,
  CreateSessionBody,
  CreateSessionResponse,
  MigrationEligibilityResponse,
  MigrateSessionBody,
  MigrateSessionResponse,
} from "./schema";
import { createUser, isUserExistByEmail, isUsernameExist } from "../user/repository";
import { hash } from "bcrypt";
import jwt from "../../utils/jwt";

// Generate a UUID v4 for session tokens
const generateSessionToken = (): string => {
  return crypto.randomUUID();
};

export const createSession = async (data: CreateSessionBody): Promise<CreateSessionResponse> => {
  const { deviceId } = data;
  
  try {
    const sessionToken = generateSessionToken();
    
    const session = await db.session.create({
      data: {
        deviceId,
        sessionToken,
        preferredCurrency: 'USD',
        migrated: false,
        lastActiveAt: new Date(),
      },
      select: {
        id: true,
        deviceId: true,
        sessionToken: true,
        createdAt: true,
        lastActiveAt: true,
        migrated: true,
        migratedToUserId: true,
        preferredCurrency: true,
      },
    });

    return {
      session: {
        ...session,
        createdAt: session.createdAt.toISOString(),
        lastActiveAt: session.lastActiveAt.toISOString(),
      },
      sessionToken,
    };
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'createSession',
      deviceId,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const validateSession = async (sessionToken: string): Promise<Session | null> => {
  try {
    const session = await db.session.findUnique({
      where: { sessionToken },
      select: {
        id: true,
        deviceId: true,
        sessionToken: true,
        createdAt: true,
        lastActiveAt: true,
        migrated: true,
        migratedToUserId: true,
        preferredCurrency: true,
      },
    });

    if (!session) {
      return null;
    }

    // Check if session is expired (30 days of inactivity)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (session.lastActiveAt < thirtyDaysAgo) {
      // Session expired, delete it
      await deleteSession(sessionToken);
      return null;
    }

    return {
      ...session,
      createdAt: session.createdAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
    };
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'validateSession',
      sessionToken,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const updateSessionActivity = async (sessionToken: string): Promise<void> => {
  try {
    await db.session.update({
      where: { sessionToken },
      data: { lastActiveAt: new Date() },
    });
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'updateSessionActivity',
      sessionToken,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const deleteSession = async (sessionToken: string): Promise<void> => {
  try {
    await db.session.delete({
      where: { sessionToken },
    });
  } catch (error) {
    // Don't throw error if session doesn't exist
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return;
    }
    
    throw ErrorFactory.databaseError({
      operation: 'deleteSession',
      sessionToken,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};


export const validateMigrationEligibility = async (sessionToken: string): Promise<MigrationEligibilityResponse> => {
  try {
    const session = await validateSession(sessionToken);
    
    if (!session) {
      return {
        canMigrate: false,
        reason: 'Session not found or expired',
      };
    }

    if (session.migrated) {
      return {
        canMigrate: false,
        reason: 'Session already migrated to user account',
      };
    }

    return {
      canMigrate: true,
    };
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'validateMigrationEligibility',
      sessionToken,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const migrateSessionToUser = async (data: MigrateSessionBody): Promise<MigrateSessionResponse> => {
  const { sessionToken, name, email, password, passwordConfirmation } = data;

  if (password !== passwordConfirmation) {
    throw ErrorFactory.validationError('Password confirmation does not match');
  }

  try {
    // Validate session exists and is eligible for migration
    const session = await validateSession(sessionToken);
    if (!session) {
      throw ErrorFactory.sessionNotFound();
    }

    if (session.migrated) {
      throw ErrorFactory.validationError('Session has already been migrated');
    }

    // Check if user with email already exists
    const userExists = await isUserExistByEmail(email);
    if (userExists) {
      throw ErrorFactory.userAlreadyExists();
    }

    // Check if username already exists
    const usernameExists = await isUsernameExist(name);
    if (usernameExists) {
      throw ErrorFactory.usernameAlreadyExists();
    }

    // Hash password
    const hashedPassword = await hash(password, 12);

    // Use a transaction to ensure data consistency
    const result = await db.$transaction(async (prisma) => {
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
        },
        select: {
          id: true,
          email: true,
          name: true,
          createdAt: true,
          updatedAt: true,
        },
      });


      // Mark session as migrated
      await prisma.session.update({
        where: { sessionToken },
        data: {
          migrated: true,
          migratedToUserId: newUser.id,
        },
      });

      return {
        user: newUser,
      };
    });

    // Generate JWT token for the new user
    const token = jwt.sign({
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        preferredCurrency: session.preferredCurrency,
        createdAt: result.user.createdAt.toISOString(),
        updatedAt: result.user.updatedAt.toISOString(),
      },
      token,
    };
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'migrateSessionToUser',
      sessionToken,
      email,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const cleanupExpiredSessions = async (): Promise<number> => {
  try {
    // Delete sessions older than 30 days of inactivity
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db.session.deleteMany({
      where: {
        lastActiveAt: {
          lt: thirtyDaysAgo,
        },
      },
    });

    return result.count;
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'cleanupExpiredSessions',
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const getSessionById = async (sessionId: string): Promise<Session | null> => {
  try {
    const session = await db.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        deviceId: true,
        sessionToken: true,
        createdAt: true,
        lastActiveAt: true,
        migrated: true,
        migratedToUserId: true,
        preferredCurrency: true,
      },
    });

    if (!session) {
      return null;
    }

    return {
      ...session,
      createdAt: session.createdAt.toISOString(),
      lastActiveAt: session.lastActiveAt.toISOString(),
    };
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'getSessionById',
      sessionId,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};