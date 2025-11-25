import { FastifyError } from 'fastify';

// Error codes enum for consistent error identification
export enum ErrorCode {
  // Authentication & Authorization
  AUTH_TOKEN_MISSING = 'AUTH_TOKEN_MISSING',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_USER_NOT_FOUND = 'AUTH_USER_NOT_FOUND',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  AUTH_PERMISSION_DENIED = 'AUTH_PERMISSION_DENIED',

  // Session Management
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_INVALID = 'SESSION_INVALID',
  SESSION_MIGRATION_FAILED = 'SESSION_MIGRATION_FAILED',

  // Validation
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  VALIDATION_MISSING_FIELD = 'VALIDATION_MISSING_FIELD',
  VALIDATION_INVALID_FORMAT = 'VALIDATION_INVALID_FORMAT',

  // Business Logic
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  USERNAME_ALREADY_EXISTS = 'USERNAME_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',

  // System Errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',

  // Network & Connection
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',

  // Resource Not Found
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  ROUTE_NOT_FOUND = 'ROUTE_NOT_FOUND',

  // Client Errors
  CLIENT_ERROR = 'CLIENT_ERROR',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Standardized error response interface
export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    details?: any;
    timestamp: string;
    requestId?: string;
    path?: string;
  };
}

// Custom application error class
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly details?: any;
  public readonly isOperational: boolean;

  constructor(
    code: ErrorCode,
    message: string,
    statusCode: number = 500,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);
    
    this.code = code;
    this.statusCode = statusCode;
    this.severity = severity;
    this.details = details;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  // Convert to API response format
  toApiResponse(requestId?: string, path?: string): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
        requestId,
        path,
      },
    };
  }
}

// Factory functions for common errors
export class ErrorFactory {
  // Authentication errors
  static tokenMissing(): AppError {
    return new AppError(
      ErrorCode.AUTH_TOKEN_MISSING,
      'Authentication token is required',
      401,
      ErrorSeverity.MEDIUM
    );
  }

  static tokenInvalid(details?: any): AppError {
    return new AppError(
      ErrorCode.AUTH_TOKEN_INVALID,
      'Authentication token is invalid',
      401,
      ErrorSeverity.MEDIUM,
      details
    );
  }

  static tokenExpired(): AppError {
    return new AppError(
      ErrorCode.AUTH_TOKEN_EXPIRED,
      'Authentication token has expired',
      401,
      ErrorSeverity.MEDIUM
    );
  }

  static userNotFound(): AppError {
    return new AppError(
      ErrorCode.AUTH_USER_NOT_FOUND,
      'User not found or no longer active',
      401,
      ErrorSeverity.MEDIUM
    );
  }

  static invalidCredentials(): AppError {
    return new AppError(
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      'Invalid email or password',
      401,
      ErrorSeverity.MEDIUM
    );
  }

  static permissionDenied(): AppError {
    return new AppError(
      ErrorCode.AUTH_PERMISSION_DENIED,
      'You do not have permission to access this resource',
      403,
      ErrorSeverity.MEDIUM
    );
  }

  // Session errors
  static sessionNotFound(): AppError {
    return new AppError(
      ErrorCode.SESSION_NOT_FOUND,
      'Session not found or expired',
      401,
      ErrorSeverity.MEDIUM
    );
  }

  static sessionExpired(): AppError {
    return new AppError(
      ErrorCode.SESSION_EXPIRED,
      'Session has expired',
      401,
      ErrorSeverity.MEDIUM
    );
  }

  static sessionInvalid(details?: any): AppError {
    return new AppError(
      ErrorCode.SESSION_INVALID,
      'Session is invalid',
      401,
      ErrorSeverity.MEDIUM,
      details
    );
  }

  static sessionMigrationFailed(details?: any): AppError {
    return new AppError(
      ErrorCode.SESSION_MIGRATION_FAILED,
      'Failed to migrate session to user account',
      500,
      ErrorSeverity.HIGH,
      details
    );
  }

  // Validation errors
  static validationFailed(details: any): AppError {
    return new AppError(
      ErrorCode.VALIDATION_FAILED,
      'Request validation failed',
      400,
      ErrorSeverity.LOW,
      details
    );
  }

  static validationError(message: string): AppError {
    return new AppError(
      ErrorCode.VALIDATION_FAILED,
      message,
      400,
      ErrorSeverity.LOW
    );
  }

  // Business logic errors
  static userAlreadyExists(): AppError {
    return new AppError(
      ErrorCode.USER_ALREADY_EXISTS,
      'A user with this email already exists',
      409,
      ErrorSeverity.LOW
    );
  }

  static usernameAlreadyExists(): AppError {
    return new AppError(
      ErrorCode.USERNAME_ALREADY_EXISTS,
      'This username is already taken',
      409,
      ErrorSeverity.LOW
    );
  }

  // System errors
  static databaseError(details?: any): AppError {
    return new AppError(
      ErrorCode.DATABASE_ERROR,
      'A database error occurred',
      500,
      ErrorSeverity.HIGH,
      details,
      false // Not operational - system issue
    );
  }

  static internalServerError(details?: any): AppError {
    return new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      'An internal server error occurred',
      500,
      ErrorSeverity.CRITICAL,
      details,
      false
    );
  }

  static externalServiceError(service: string, details?: any): AppError {
    return new AppError(
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      `External service (${service}) is unavailable`,
      503,
      ErrorSeverity.HIGH,
      details
    );
  }

  // Resource errors
  static resourceNotFound(resource: string = 'resource'): AppError {
    return new AppError(
      ErrorCode.RESOURCE_NOT_FOUND,
      `The requested ${resource} was not found`,
      404,
      ErrorSeverity.LOW
    );
  }

  static routeNotFound(method: string, path: string): AppError {
    return new AppError(
      ErrorCode.ROUTE_NOT_FOUND,
      `Route ${method} ${path} not found`,
      404,
      ErrorSeverity.LOW,
      { method, path }
    );
  }

  static clientError(message: string = 'Bad request', statusCode: number = 400): AppError {
    return new AppError(
      ErrorCode.CLIENT_ERROR,
      message,
      statusCode,
      ErrorSeverity.LOW
    );
  }
}

// Helper function to determine if an error should include details in the response
export function shouldIncludeErrorDetails(error: AppError, isDevelopment: boolean): boolean {
  // Always include details for operational errors in development
  if (isDevelopment && error.isOperational) return true;
  
  // Never include details for non-operational (system) errors in production
  if (!isDevelopment && !error.isOperational) return false;
  
  // Include details for low/medium severity operational errors
  return error.isOperational && [ErrorSeverity.LOW, ErrorSeverity.MEDIUM].includes(error.severity);
}

// Helper to convert unknown errors to AppError
export function normalizeError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof Error) {
    return new AppError(
      ErrorCode.INTERNAL_SERVER_ERROR,
      error.message,
      500,
      ErrorSeverity.CRITICAL,
      { originalError: error.message },
      false
    );
  }

  return ErrorFactory.internalServerError({ originalError: String(error) });
}