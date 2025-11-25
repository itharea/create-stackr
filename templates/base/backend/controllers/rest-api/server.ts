import fastify from "fastify";

import config from "./plugins/config";
import auth from "./plugins/auth";
import errorHandler from "./plugins/error-handler";
import authRoutes from "./routes/auth";
import sessionRoutes from "./routes/sessions";

const server = fastify({
  ajv: {
    customOptions: {
      removeAdditional: "all",
      coerceTypes: true,
      useDefaults: true,
      formats: {
        'date-time': true, // Accept any string for date-time format
      },
    },
  },
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    } : undefined,
  },
  // Generate request IDs for better error tracking
  genReqId: () => `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
});

// Register core plugins first
await server.register(config);

// Register error handler early to catch all errors
await server.register(errorHandler);

// Register CORS
await server.register(import('@fastify/cors'), {
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || false
    : true, // Allow all origins in development
  credentials: true,
});

// Register auth plugin
await server.register(auth);

// Register routes
await server.register(authRoutes, { prefix: "/auth" });
await server.register(sessionRoutes, { prefix: "/sessions" });

// Root health check
server.get("/", async (request, reply) => {
  return reply.code(200).send({ 
    message: "Auth API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

await server.ready();

export default server;