import type { AuthFastifyRequest } from "fastify";
import { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { listUsers, getUserWithRole, updateUserRole, deleteUser } from "../../../domain/user/repository";
import { ErrorFactory } from "../../../utils/errors";

const adminRoutes: FastifyPluginAsync = async (server) => {
  // All admin routes require auth + admin role
  server.addHook("onRequest", server.requireAuth);
  server.addHook("onRequest", async (request, reply) => {
    const { user } = request as AuthFastifyRequest;
    if (user.role !== "admin") {
      const err = ErrorFactory.permissionDenied();
      const response = err.toApiResponse(request.id, request.url);
      return reply.status(err.statusCode).send(response);
    }
  });

  // GET /users - list all users with optional search/role filter
  server.get(
    "/users",
    {
      schema: {
        querystring: Type.Object({
          search: Type.Optional(Type.String()),
          role: Type.Optional(Type.String()),
        }),
      },
    },
    async (request, reply) => {
      const { search, role } = request.query as { search?: string; role?: string };
      const users = await listUsers({ search, role });

      return reply.send(
        users.map((u) => ({
          ...u,
          createdAt: u.createdAt.toISOString(),
          updatedAt: u.updatedAt.toISOString(),
        }))
      );
    }
  );

  // GET /users/:id - get single user
  server.get(
    "/users/:id",
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const user = await getUserWithRole(id);

      if (!user) {
        throw ErrorFactory.resourceNotFound("user");
      }

      return reply.send({
        ...user,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });
    }
  );

  // PUT /users/:id/role - update user role
  server.put(
    "/users/:id/role",
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
        body: Type.Object({
          role: Type.Union([
            Type.Literal("admin"),
            Type.Literal("mentor"),
            Type.Literal("student"),
            Type.Literal("alumni"),
          ]),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { role } = request.body as { role: string };
      const updated = await updateUserRole(id, role);

      if (!updated) {
        throw ErrorFactory.resourceNotFound("user");
      }

      return reply.send(updated);
    }
  );

  // DELETE /users/:id - delete user
  server.delete(
    "/users/:id",
    {
      schema: {
        params: Type.Object({ id: Type.String() }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const { user: currentUser } = request as AuthFastifyRequest;

      if (id === currentUser.id) {
        throw ErrorFactory.clientError("Cannot delete your own account");
      }

      await deleteUser(id);

      return reply.send({ success: true });
    }
  );
};

export default adminRoutes;
