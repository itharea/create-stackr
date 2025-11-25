import { AuthFastifyRequest, SessionFastifyRequest, AuthOrSessionFastifyRequest, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import jwt from "../../../utils/jwt";
import Ajv from "ajv";
import { User, UserSchema } from "../../../domain/user/schema";
import { Session } from "../../../domain/session/schema";
import { Type } from "@sinclair/typebox";
import { isUserExistByEmail } from "../../../domain/user/repository";
import { validateSession, updateSessionActivity } from "../../../domain/session/repository";
import { ErrorFactory, normalizeError } from "../../../utils/errors";

// JWT payload schema
const JWTPayloadSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  name: Type.String(),
  iat: Type.Optional(Type.Number()),
  exp: Type.Optional(Type.Number()),
});

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: true,
  useDefaults: true,
  coerceTypes: true,
});

const authPlugin: FastifyPluginAsync = async (server) => {
  server.decorate(
    "requireAuth",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        // Extract the token from the Authorization header
        const authHeader = request.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          throw ErrorFactory.tokenMissing();
        }

        const token = authHeader.substring(7, authHeader.length);

        // Verify the token
        let decoded: any;
        try {
          decoded = jwt.verify(token);
        } catch (jwtError) {
          throw ErrorFactory.tokenInvalid({
            reason: jwtError instanceof Error ? jwtError.message : 'Token verification failed'
          });
        }

        // Validate the decoded token payload
        const validate = ajv.compile(JWTPayloadSchema);
        const valid = validate(decoded);

        if (!valid) {
          throw ErrorFactory.tokenInvalid({
            reason: 'Invalid token payload structure',
            details: validate.errors
          });
        }

        const user = decoded as User;
        
        // Check if user still exists in database
        const userExists = await isUserExistByEmail(user.email);

        if (!userExists) {
          throw ErrorFactory.userNotFound();
        }

        (request as AuthFastifyRequest).user = user;
        (request as AuthFastifyRequest).token = token;

      } catch (error) {
        // Normalize the error and send standardized response
        const appError = normalizeError(error);
        const response = appError.toApiResponse(
          request.id,
          request.url
        );

        return reply.status(appError.statusCode).send(response);
      }
    }
  );

  // Session-only authentication middleware
  server.decorate(
    "requireSession",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        // Extract the session token from the X-Session-Token header
        const sessionTokenHeader = request.headers['x-session-token'] as string;
        if (!sessionTokenHeader) {
          throw ErrorFactory.tokenMissing();
        }

        // Validate the session
        const session = await validateSession(sessionTokenHeader);
        if (!session) {
          throw ErrorFactory.sessionNotFound();
        }

        // Update session activity (heartbeat)
        await updateSessionActivity(sessionTokenHeader);

        (request as SessionFastifyRequest).session = session;
        (request as SessionFastifyRequest).sessionToken = sessionTokenHeader;

      } catch (error) {
        // Normalize the error and send standardized response
        const appError = normalizeError(error);
        const response = appError.toApiResponse(
          request.id,
          request.url
        );

        return reply.status(appError.statusCode).send(response);
      }
    }
  );

  // Flexible authentication middleware (accepts either JWT or Session)
  server.decorate(
    "requireAuthOrSession",
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      try {
        const authHeader = request.headers.authorization;
        const sessionTokenHeader = request.headers['x-session-token'] as string;

        // Try JWT first
        if (authHeader && authHeader.startsWith("Bearer ")) {
          try {
            await server.requireAuth(request, reply);
            // If we get here, JWT auth succeeded
            (request as AuthOrSessionFastifyRequest).authType = 'user';
            return;
          } catch (jwtError) {
            // JWT auth failed, try session auth
          }
        }

        // Try session token
        if (sessionTokenHeader) {
          try {
            await server.requireSession(request, reply);
            // If we get here, session auth succeeded
            (request as AuthOrSessionFastifyRequest).authType = 'session';
            return;
          } catch (sessionError) {
            // Session auth failed
          }
        }

        // Neither auth method worked
        throw ErrorFactory.tokenMissing();

      } catch (error) {
        // Normalize the error and send standardized response
        const appError = normalizeError(error);
        const response = appError.toApiResponse(
          request.id,
          request.url
        );

        return reply.status(appError.statusCode).send(response);
      }
    }
  );
};

declare module "fastify" {
  export interface AuthFastifyRequest extends FastifyRequest {
    user: User;
    token: string;
  }

  export interface SessionFastifyRequest extends FastifyRequest {
    session: Session;
    sessionToken: string;
  }

  export interface AuthOrSessionFastifyRequest extends FastifyRequest {
    user?: User;
    token?: string;
    session?: Session;
    sessionToken?: string;
    authType: 'user' | 'session';
  }

  export interface FastifyInstance {
    requireAuth: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    requireSession: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
    requireAuthOrSession: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

export default fp(authPlugin);