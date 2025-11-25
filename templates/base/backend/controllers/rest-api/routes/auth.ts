import { FastifyPluginAsync, AuthFastifyRequest } from "fastify";
import { Type } from "@sinclair/typebox";
import { UserSchema } from "../../../domain/user/schema";
import { 
  LoginBody, 
  LoginResponse, 
  RegisterBody, 
  RegisterBodySchema, 
  RegisterResponse, 
  RegisterResponseSchema,
  UpdateProfileBody,
  UpdateProfileBodySchema,
  UpdateProfileResponse,
  UpdateProfileResponseSchema,
  ChangePasswordBody,
  ChangePasswordBodySchema,
  LoginBodySchema,
  LoginResponseSchema
} from "../../../domain/auth/schema";
import { loginUser, registerUser, updateUser, changePassword } from "../../../domain/auth/repository";

const authRoutes: FastifyPluginAsync = async (server) => {

  // Get current user endpoint
  server.get(
    "/me", 
    {
      onRequest: server.requireAuth,
      schema: {
        response: {
          200: UserSchema,
          404: Type.Object({
            error: Type.String()
          }),
        },
      },
    }, 
    async (request, reply) => {
      const tokenUser = (request as AuthFastifyRequest).user;
      
      // Fetch fresh user data from database to get latest info
      const { getUser } = await import("../../../domain/user/repository");
      const currentUser = await getUser(tokenUser.id);
      
      if (!currentUser) {
        return reply.status(404).send({ error: "User not found" });
      }
      
      return reply.status(200).send({
        ...currentUser,
        createdAt: currentUser.createdAt.toISOString(),
        updatedAt: currentUser.updatedAt.toISOString(),
      });
    }
  );

  // Register endpoint
  server.post<{Body: RegisterBody; Reply: RegisterResponse}>(
    "/register",
    {
      schema: {
        body: RegisterBodySchema,
        response: {
          200: RegisterResponseSchema,
        }
      }
    },
    async (request, reply) => {
      const { name, email, password, passwordConfirmation } = request.body;

      const response = await registerUser({
        name,
        email, 
        password,
        passwordConfirmation
      });

      return reply.code(200).send(response);
    }
  );

  // Login endpoint
  server.post<{Body: LoginBody; Reply: LoginResponse}>(
    "/login",
    {
      schema: {
        body: LoginBodySchema,
        response: {
          200: LoginResponseSchema,
        }
      }
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const response = await loginUser({
        email,
        password,
      });

      return reply.code(200).send(response);
    }
  );

  // Update profile endpoint
  server.put<{Body: UpdateProfileBody}>(
    "/profile",
    {
      onRequest: server.requireAuth,
      schema: {
        body: UpdateProfileBodySchema,
        response: {
          200: UpdateProfileResponseSchema,
        }
      }
    },
    async (request, reply) => {
      const user = (request as AuthFastifyRequest).user;
      const updateData = request.body;

      const updatedUser = await updateUser(user.id, updateData);

      return reply.code(200).send({
        ...updatedUser,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      });
    }
  );

  // Change password endpoint
  server.put<{Body: ChangePasswordBody}>(
    "/password",
    {
      onRequest: server.requireAuth,
      schema: {
        body: ChangePasswordBodySchema,
      }
    },
    async (request, reply) => {
      const user = (request as AuthFastifyRequest).user;
      const { currentPassword, newPassword } = request.body;

      await changePassword(user.id, currentPassword, newPassword);

      return reply.code(200).send({ message: "Password changed successfully" });
    }
  );

  // Delete account endpoint
  server.delete(
    "/account",
    {
      onRequest: server.requireAuth,
      schema: {
        response: {
          200: Type.Object({
            message: Type.String()
          })
        }
      }
    },
    async (request, reply) => {
      const user = (request as AuthFastifyRequest).user;
      const { deleteUser } = await import("../../../domain/user/repository");

      await deleteUser(user.id);

      return reply.code(200).send({ message: "Account deleted successfully" });
    }
  );

  // Health check endpoint
  server.get("/health", async (request, reply) => {
    return reply.code(200).send({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "auth"
    });
  });
};

export default authRoutes;