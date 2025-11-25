import { db } from "../../utils/db";
import { ErrorFactory } from "../../utils/errors";

export const getUser = async (id: string) => {
  try {
    const user = await db.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        email: true,
        name: true,
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

export const createUser = async (
  email: string,
  password: string,
  name: string
) => {
  // Check if user already exists
  const userExist = await isUserExistByEmail(email);
  if (userExist) {
    throw ErrorFactory.userAlreadyExists();
  }

  // Check if username already exists
  const usernameExist = await isUsernameExist(name);
  if (usernameExist) {
    throw ErrorFactory.usernameAlreadyExists();
  }

  try {
    const user = await db.user.create({
      data: {
        email,
        password,
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
    return user;
  } catch (error) {
    throw ErrorFactory.databaseError({ 
      operation: 'createUser', 
      email,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const isUserExistByEmail = async (email: string): Promise<boolean> => {
  try {
    const userCount = await db.user.count({
      where: {
        email,
      },
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

export const isUsernameExist = async (name: string): Promise<boolean> => {
  try {
    const userCount = await db.user.count({
      where: {
        name,
      },
    });
    return userCount > 0;
  } catch (error) {
    throw ErrorFactory.databaseError({ 
      operation: 'isUsernameExist', 
      name,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const findUserByEmailWithPassword = async (email: string) => {
  try {
    const user = await db.user.findUnique({
      where: {
        email,
      },
    });
    return user;
  } catch (error) {
    throw ErrorFactory.databaseError({ 
      operation: 'findUserByEmailWithPassword', 
      email,
      originalError: error instanceof Error ? error.message : String(error)
    });
  }
};

export const updateUserProfile = async (
  userId: string,
  data: { name?: string; email?: string }
) => {
  // Check if new name already exists (if updating name)
  if (data.name) {
    const nameExists = await db.user.count({
      where: {
        name: data.name,
        NOT: { id: userId }, // Exclude current user
      },
    });
    
    if (nameExists > 0) {
      throw ErrorFactory.usernameAlreadyExists();
    }
  }

  // Check if new email already exists (if updating email)
  if (data.email) {
    const emailExists = await db.user.count({
      where: {
        email: data.email,
        NOT: { id: userId }, // Exclude current user
      },
    });
    
    if (emailExists > 0) {
      throw ErrorFactory.userAlreadyExists();
    }
  }

  try {
    const user = await db.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
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

export const updateUserPassword = async (userId: string, hashedPassword: string) => {
  try {
    await db.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  } catch (error) {
    throw ErrorFactory.databaseError({
      operation: 'updateUserPassword',
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