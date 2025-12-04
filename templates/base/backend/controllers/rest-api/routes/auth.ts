import type { AuthFastifyRequest } from "fastify";
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { auth } from "../../../lib/auth";
import { Type } from "@sinclair/typebox";
import { db } from "../../../utils/db";

/**
 * Convert Fastify request to Fetch API Request for BetterAuth
 * BetterAuth expects a standard Fetch API Request object
 */
function toFetchRequest(request: FastifyRequest): Request {
  // Construct full URL
  const url = `${request.protocol}://${request.hostname}${request.url}`;

  // Convert Fastify headers to Fetch API Headers
  const headers = new Headers();
  Object.entries(request.headers).forEach(([key, value]) => {
    if (value) {
      headers.set(key, Array.isArray(value) ? value[0] : value);
    }
  });

  // Create Fetch API compatible Request
  // Note: GET and HEAD requests cannot have a body
  const hasBody = request.method !== "GET" && request.method !== "HEAD" && request.body;

  return new Request(url, {
    method: request.method,
    headers,
    body: hasBody ? JSON.stringify(request.body) : undefined,
  });
}

const authRoutes: FastifyPluginAsync = async (server) => {
  // Mount BetterAuth handler for all /* routes under this plugin
  // Since this plugin is registered at /api/auth, BetterAuth handles /api/auth/*
  // BetterAuth handles: sign-in, sign-up, sign-out, oauth callbacks, etc.
  server.all("/*", async (request, reply) => {
    // Convert Fastify request to Fetch API Request for BetterAuth
    const fetchRequest = toFetchRequest(request);
    const response = await auth.handler(fetchRequest);

    // Copy response headers
    response.headers.forEach((value, key) => {
      reply.header(key, value);
    });

    // Send response body
    // Use text() to get the response body as BetterAuth may return JSON or other content
    const body = await response.text();
    reply.status(response.status).send(body);
  });

  // Keep custom endpoints that extend BetterAuth functionality

  // Get current user (uses BetterAuth session)
  server.get(
    "/me",
    {
      onRequest: server.requireAuth,
      schema: {
        response: {
          200: Type.Object({
            id: Type.String(),
            email: Type.String(),
            name: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            emailVerified: Type.Boolean(),
            image: Type.Optional(Type.Union([Type.String(), Type.Null()])),
            createdAt: Type.String(),
            updatedAt: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      // user is attached by requireAuth middleware
      const { user } = request as AuthFastifyRequest;
      return reply.send({
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
        image: user.image,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      });
    }
  );

  // Update profile (custom endpoint, BetterAuth doesn't provide this)
  server.put(
    "/profile",
    {
      onRequest: server.requireAuth,
      schema: {
        body: Type.Object({
          name: Type.Optional(Type.String()),
        }),
      },
    },
    async (request, reply) => {
      const { user } = request as AuthFastifyRequest;
      const { name } = request.body as { name?: string };

      const updatedUser = await db.user.update({
        where: { id: user.id },
        data: { name },
      });

      return reply.send({
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        emailVerified: updatedUser.emailVerified,
        image: updatedUser.image,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      });
    }
  );

  // Delete account
  server.delete(
    "/account",
    {
      onRequest: server.requireAuth,
    },
    async (request, reply) => {
      const { user } = request as AuthFastifyRequest;

      await db.user.delete({
        where: { id: user.id },
      });

      return reply.send({ message: "Account deleted successfully" });
    }
  );

  // Health check
  server.get("/health", async (request, reply) => {
    return reply.send({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "auth",
    });
  });
};

export default authRoutes;
