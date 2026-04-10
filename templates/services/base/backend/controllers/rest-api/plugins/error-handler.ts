import fp from "fastify-plugin";
import { FastifyPluginAsync, FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { AppError, normalizeError, shouldIncludeErrorDetails, ErrorFactory } from "../../../utils/errors";

const errorHandlerPlugin: FastifyPluginAsync = async (server) => {
  // Global error handler
  server.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Log the error for debugging
    server.log.error({
      error: {
        message: error.message,
        stack: error.stack,
        statusCode: error.statusCode,
        validation: error.validation,
      },
      request: {
        id: request.id,
        method: request.method,
        url: request.url,
        headers: request.headers,
        body: request.body,
      },
    }, 'Request error occurred');

    let appError: AppError;

    // Handle different types of errors
    if (error instanceof AppError) {
      // Already an AppError, use as-is
      appError = error;
    } else if (error.statusCode === 400 && error.validation) {
      // Fastify validation error
      appError = ErrorFactory.validationFailed({
        fields: error.validation,
        originalMessage: error.message
      });
    } else if (error.statusCode === 401) {
      // Unauthorized error
      appError = ErrorFactory.tokenInvalid({ originalMessage: error.message });
    } else if (error.statusCode === 403) {
      // Forbidden error
      appError = ErrorFactory.permissionDenied();
    } else if (error.statusCode === 404) {
      // Not found error
      appError = ErrorFactory.resourceNotFound('resource');
    } else if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      // Other client errors
      appError = ErrorFactory.clientError(
        error.message || 'Bad request',
        error.statusCode
      );
    } else {
      // Server errors or unknown errors
      appError = normalizeError(error);
    }

    // Determine if we should include error details
    const includeDetails = shouldIncludeErrorDetails(appError, isDevelopment);
    
    // Create the response
    const response = appError.toApiResponse(request.id, request.url);
    
    // Remove details if they shouldn't be included
    if (!includeDetails) {
      delete response.error.details;
    }

    // Add stack trace in development for critical errors
    if (isDevelopment && appError.severity === 'critical') {
      response.error.details = {
        ...response.error.details,
        stack: error.stack
      };
    }

    // Send the error response
    return reply.status(appError.statusCode).send(response);
  });

  // Handle 404 errors for routes that don't exist
  server.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
    const appError = ErrorFactory.routeNotFound(request.method, request.url);
    const response = appError.toApiResponse(request.id, request.url);
    return reply.status(404).send(response);
  });

  // Add request ID generation for better error tracking
  server.addHook('onRequest', async (request) => {
    // Generate a unique request ID if not already present
    if (!request.id) {
      request.id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  });

  // Add response time tracking
  server.addHook('onRequest', async (request) => {
    (request as any).startTime = Date.now();
  });

  server.addHook('onResponse', async (request, reply) => {
    const responseTime = Date.now() - ((request as any).startTime || Date.now());
    server.log.info({
      request: {
        id: request.id,
        method: request.method,
        url: request.url,
      },
      response: {
        statusCode: reply.statusCode,
        responseTime: `${responseTime}ms`
      }
    }, 'Request completed');
  });
};

export default fp(errorHandlerPlugin);