import type { AuthFastifyRequest } from "fastify";
import { FastifyPluginAsync } from "fastify";
import { Type } from "@sinclair/typebox";
import { eq, ilike, or, and } from "drizzle-orm";
import { db, schema } from "../../../utils/db";
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

      const conditions = [];
      if (role) {
        conditions.push(eq(schema.user.role, role));
      }
      if (search) {
        const pattern = `%${search}%`;
        conditions.push(
          or(
            ilike(schema.user.email, pattern),
            ilike(schema.user.name, pattern)
          )!
        );
      }

      const users = await db
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

      const [updated] = await db
        .update(schema.user)
        .set({ role, updatedAt: new Date() })
        .where(eq(schema.user.id, id))
        .returning({ id: schema.user.id, role: schema.user.role });

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

      await db.delete(schema.user).where(eq(schema.user.id, id));

      return reply.send({ success: true });
    }
  );
};

export default adminRoutes;
