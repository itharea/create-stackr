import type { DeviceSessionFastifyRequest } from "fastify";
import { FastifyPluginAsync } from "fastify";
import {
  CreateDeviceSessionBodySchema,
  CreateDeviceSessionResponseSchema,
  ValidateDeviceSessionBodySchema,
  DeviceSessionValidationResponseSchema,
  UpdateDeviceSessionActivityBodySchema,
  DeviceSessionMigrationEligibilityResponseSchema,
} from "../../../domain/device-session/schema";
import {
  createDeviceSession,
  validateDeviceSession,
  validateDeviceSessionMigrationEligibility,
  cleanupExpiredDeviceSessions,
} from "../../../domain/device-session/service";
import {
  updateDeviceSessionActivity,
  deleteDeviceSession,
} from "../../../domain/device-session/repository";
import { Type } from "@sinclair/typebox";

const deviceSessionRoutes: FastifyPluginAsync = async (server) => {
  // Create new anonymous device session
  server.post<{
    Body: typeof CreateDeviceSessionBodySchema._type;
    Reply: typeof CreateDeviceSessionResponseSchema._type;
  }>(
    "/",
    {
      schema: {
        body: CreateDeviceSessionBodySchema,
        response: {
          201: CreateDeviceSessionResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { deviceId } = request.body as typeof CreateDeviceSessionBodySchema._type;

      const result = await createDeviceSession({ deviceId });
      return reply.status(201).send(result);
    }
  );

  // Validate device session token
  server.post<{
    Body: typeof ValidateDeviceSessionBodySchema._type;
    Reply: typeof DeviceSessionValidationResponseSchema._type;
  }>(
    "/validate",
    {
      schema: {
        body: ValidateDeviceSessionBodySchema,
        response: {
          200: DeviceSessionValidationResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { sessionToken } = request.body as typeof ValidateDeviceSessionBodySchema._type;

      const session = await validateDeviceSession(sessionToken);
      return reply.status(200).send({
        valid: !!session,
        session: session || undefined,
      });
    }
  );

  // Update device session activity (heartbeat)
  server.put<{
    Body: typeof UpdateDeviceSessionActivityBodySchema._type;
  }>(
    "/activity",
    {
      schema: {
        body: UpdateDeviceSessionActivityBodySchema,
        response: {
          200: Type.Object({
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { sessionToken } = request.body as typeof UpdateDeviceSessionActivityBodySchema._type;

      await updateDeviceSessionActivity(sessionToken);
      return reply.status(200).send({ message: "Device session activity updated" });
    }
  );

  // Get device session info (requires device session auth)
  server.get<{
    Reply: typeof DeviceSessionMigrationEligibilityResponseSchema._type;
  }>(
    "/info",
    {
      onRequest: server.requireDeviceSession,
      schema: {
        response: {
          200: DeviceSessionMigrationEligibilityResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const sessionRequest = request as DeviceSessionFastifyRequest;
      const sessionToken = sessionRequest.sessionToken;

      const eligibility = await validateDeviceSessionMigrationEligibility(sessionToken);
      return reply.status(200).send(eligibility);
    }
  );

  // Check migration eligibility
  server.post<{
    Body: typeof ValidateDeviceSessionBodySchema._type;
    Reply: typeof DeviceSessionMigrationEligibilityResponseSchema._type;
  }>(
    "/migration-eligibility",
    {
      schema: {
        body: ValidateDeviceSessionBodySchema,
        response: {
          200: DeviceSessionMigrationEligibilityResponseSchema,
        },
      },
    },
    async (request, reply) => {
      const { sessionToken } = request.body as typeof ValidateDeviceSessionBodySchema._type;

      const eligibility = await validateDeviceSessionMigrationEligibility(sessionToken);
      return reply.status(200).send(eligibility);
    }
  );

  // Delete device session
  server.delete<{
    Body: typeof ValidateDeviceSessionBodySchema._type;
  }>(
    "/",
    {
      schema: {
        body: ValidateDeviceSessionBodySchema,
        response: {
          200: Type.Object({
            message: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { sessionToken } = request.body as typeof ValidateDeviceSessionBodySchema._type;

      await deleteDeviceSession(sessionToken);
      return reply.status(200).send({ message: "Device session deleted successfully" });
    }
  );

  // Device session cleanup endpoint (for admin/cron use)
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
      const deletedCount = await cleanupExpiredDeviceSessions();
      return reply.status(200).send({
        message: `Cleaned up ${deletedCount} expired device sessions`,
        deletedCount,
      });
    }
  );

  // Health check endpoint
  server.get("/health", async (request, reply) => {
    return reply.code(200).send({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "device-session"
    });
  });
};

export default deviceSessionRoutes;
