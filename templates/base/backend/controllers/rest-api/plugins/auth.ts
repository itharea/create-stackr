import type {
  AuthFastifyRequest,
  DeviceSessionFastifyRequest,
  AuthOrDeviceSessionFastifyRequest,
} from "fastify";
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { auth, Session } from "../../../lib/auth";
import { validateDeviceSession } from "../../../domain/device-session/service";
import { updateDeviceSessionActivity } from "../../../domain/device-session/repository";
import { DeviceSession } from "../../../domain/device-session/schema";
import { ErrorFactory, normalizeError } from "../../../utils/errors";

/**
 * Convert Node.js/Fastify headers to Web API Headers object for BetterAuth
 */
function toHeaders(requestHeaders: FastifyRequest["headers"]): Headers {
  const headers = new Headers();
  Object.entries(requestHeaders).forEach(([key, value]) => {
    if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
  });
  return headers;
}

const authPlugin: FastifyPluginAsync = async (server) => {
  // Authenticated user middleware (using BetterAuth session)
  // Uses cookie-based authentication for both mobile and web clients
  server.decorate(
    "requireAuth",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        // Validate session via BetterAuth (reads cookies from headers)
        const session = await auth.api.getSession({
          headers: toHeaders(request.headers),
        });

        if (!session || !session.user) {
          throw ErrorFactory.unauthorized();
        }

        // Attach to request
        (request as AuthFastifyRequest).user = session.user;
        (request as AuthFastifyRequest).session = session.session;
      } catch (error) {
        const appError = normalizeError(error);
        const response = appError.toApiResponse(request.id, request.url);
        return reply.status(appError.statusCode).send(response);
      }
    }
  );

  // Anonymous device session middleware (for device-based sessions before auth)
  server.decorate(
    "requireDeviceSession",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const sessionTokenHeader = request.headers["x-device-session-token"] as string;
        if (!sessionTokenHeader) {
          throw ErrorFactory.tokenMissing();
        }

        const deviceSession = await validateDeviceSession(sessionTokenHeader);
        if (!deviceSession) {
          throw ErrorFactory.sessionNotFound();
        }

        await updateDeviceSessionActivity(sessionTokenHeader);

        (request as DeviceSessionFastifyRequest).deviceSession = deviceSession;
        (request as DeviceSessionFastifyRequest).sessionToken = sessionTokenHeader;
      } catch (error) {
        const appError = normalizeError(error);
        const response = appError.toApiResponse(request.id, request.url);
        return reply.status(appError.statusCode).send(response);
      }
    }
  );

  // Flexible auth: accepts either BetterAuth session or device session
  server.decorate(
    "requireAuthOrDeviceSession",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        // Try BetterAuth session first (cookie-based)
        try {
          const session = await auth.api.getSession({
            headers: toHeaders(request.headers),
          });

          if (session && session.user) {
            (request as AuthOrDeviceSessionFastifyRequest).user = session.user;
            (request as AuthOrDeviceSessionFastifyRequest).session = session.session;
            (request as AuthOrDeviceSessionFastifyRequest).authType = "user";
            return;
          }
        } catch {
          // BetterAuth session not found, try device session
        }

        // Try device session
        const sessionTokenHeader = request.headers["x-device-session-token"] as string;
        if (sessionTokenHeader) {
          const deviceSession = await validateDeviceSession(sessionTokenHeader);
          if (deviceSession) {
            await updateDeviceSessionActivity(sessionTokenHeader);
            (request as AuthOrDeviceSessionFastifyRequest).deviceSession = deviceSession;
            (request as AuthOrDeviceSessionFastifyRequest).sessionToken = sessionTokenHeader;
            (request as AuthOrDeviceSessionFastifyRequest).authType = "device";
            return;
          }
        }

        throw ErrorFactory.unauthorized();
      } catch (error) {
        const appError = normalizeError(error);
        const response = appError.toApiResponse(request.id, request.url);
        return reply.status(appError.statusCode).send(response);
      }
    }
  );
};

// Extend Fastify module with auth types and middleware decorators
declare module "fastify" {
  // For authenticated users (BetterAuth session)
  export interface AuthFastifyRequest extends FastifyRequest {
    user: Session["user"];
    session: Session["session"];
  }

  // For device/anonymous sessions (before user authentication)
  export interface DeviceSessionFastifyRequest extends FastifyRequest {
    deviceSession: DeviceSession;
    sessionToken: string;
  }

  // For endpoints that accept either auth type
  export interface AuthOrDeviceSessionFastifyRequest extends FastifyRequest {
    user?: Session["user"];
    session?: Session["session"];
    deviceSession?: DeviceSession;
    sessionToken?: string;
    authType: "user" | "device";
  }

  interface FastifyInstance {
    requireAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireDeviceSession: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAuthOrDeviceSession: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(authPlugin);
