import { FastifyPluginAsync, SessionFastifyRequest } from "fastify";
import {
  CreateSessionBodySchema,
  CreateSessionResponseSchema,
  ValidateSessionBodySchema,
  SessionValidationResponseSchema,
  UpdateSessionActivityBodySchema,
  MigrationEligibilityResponseSchema,
  MigrateSessionBodySchema,
  MigrateSessionResponseSchema,
} from "../../../domain/session/schema";
import {
  createSession,
  validateSession,
  updateSessionActivity,
  validateMigrationEligibility,
  deleteSession,
  migrateSessionToUser,
  cleanupExpiredSessions,
} from "../../../domain/session/repository";
import { Type } from "@sinclair/typebox";

const sessionRoutes: FastifyPluginAsync = async (server) => {
  // Create new anonymous session
  server.post<{
    Body: typeof CreateSessionBodySchema._type;
    Reply: typeof CreateSessionResponseSchema._type;
  }>(
    "/",
    {
      schema: {
        body: CreateSessionBodySchema,
        response: {
          201: CreateSessionResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { deviceId } = request.body as typeof CreateSessionBodySchema._type;
      
      const result = await createSession({ deviceId });
      return reply.status(201).send(result);
    }
  );

  // Validate session token
  server.post<{
    Body: typeof ValidateSessionBodySchema._type;
    Reply: typeof SessionValidationResponseSchema._type;
  }>(
    "/validate",
    {
      schema: {
        body: ValidateSessionBodySchema,
        response: {
          200: SessionValidationResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { sessionToken } = request.body as typeof ValidateSessionBodySchema._type;
      
      const session = await validateSession(sessionToken);
      return reply.status(200).send({
        valid: !!session,
        session: session || undefined,
      });
    }
  );

  // Update session activity (heartbeat)
  server.put<{
    Body: typeof UpdateSessionActivityBodySchema._type;
  }>(
    "/activity",
    {
      schema: {
        body: UpdateSessionActivityBodySchema,
        response: {
          200: Type.Object({
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { sessionToken } = request.body as typeof UpdateSessionActivityBodySchema._type;
      
      await updateSessionActivity(sessionToken);
      return reply.status(200).send({ message: "Session activity updated" });
    }
  );

  // Get session info (requires session auth)
  server.get<{
    Reply: typeof MigrationEligibilityResponseSchema._type;
  }>(
    "/info",
    {
      onRequest: server.requireSession,
      schema: {
        response: {
          200: MigrationEligibilityResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const sessionRequest = request as SessionFastifyRequest;
      const sessionToken = sessionRequest.sessionToken;
      
      const eligibility = await validateMigrationEligibility(sessionToken);
      return reply.status(200).send(eligibility);
    }
  );

  // Check migration eligibility
  server.post<{
    Body: typeof ValidateSessionBodySchema._type;
    Reply: typeof MigrationEligibilityResponseSchema._type;
  }>(
    "/migration-eligibility",
    {
      schema: {
        body: ValidateSessionBodySchema,
        response: {
          200: MigrationEligibilityResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { sessionToken } = request.body as typeof ValidateSessionBodySchema._type;
      
      const eligibility = await validateMigrationEligibility(sessionToken);
      return reply.status(200).send(eligibility);
    }
  );

  // Migrate session to user account
  server.post<{
    Body: typeof MigrateSessionBodySchema._type;
    Reply: typeof MigrateSessionResponseSchema._type;
  }>(
    "/migrate",
    {
      schema: {
        body: MigrateSessionBodySchema,
        response: {
          200: MigrateSessionResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const migrationData = request.body as typeof MigrateSessionBodySchema._type;
      
      const result = await migrateSessionToUser(migrationData);
      return reply.status(200).send(result);
    }
  );

  // Delete session
  server.delete<{
    Body: typeof ValidateSessionBodySchema._type;
  }>(
    "/",
    {
      schema: {
        body: ValidateSessionBodySchema,
        response: {
          200: Type.Object({
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { sessionToken } = request.body as typeof ValidateSessionBodySchema._type;
      
      await deleteSession(sessionToken);
      return reply.status(200).send({ message: "Session deleted successfully" });
    }
  );

  // Session cleanup endpoint (for admin/cron use)
  server.delete<{
    Reply: {
      message: string;
      deletedCount: number;
    };
  }>(
    "/cleanup",
    {
      // Note: In production, this should be protected by admin auth or API key
      schema: {
        response: {
          200: Type.Object({
            message: Type.String(),
            deletedCount: Type.Number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const deletedCount = await cleanupExpiredSessions();
      return reply.status(200).send({
        message: `Cleaned up ${deletedCount} expired sessions`,
        deletedCount,
      });
    }
  );

  // Health check endpoint
  server.get("/health", async (request, reply) => {
    return reply.code(200).send({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      service: "session"
    });
  });
};

export default sessionRoutes;