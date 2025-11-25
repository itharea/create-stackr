import axios from 'axios';

export interface AppError {
  type: string;
  message: string;
  details?: any;
}

class ErrorService {
  private static instance: ErrorService;

  private constructor() {}

  public static getInstance(): ErrorService {
    if (!ErrorService.instance) {
      ErrorService.instance = new ErrorService();
    }
    return ErrorService.instance;
  }

  handleAxiosError(error: any, context?: { [key: string]: any }): AppError {
    if (axios.isAxiosError(error)) {
      // Network error (no response)
      if (!error.response) {
        if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          return {
            type: 'TIMEOUT_ERROR',
            message: 'Request timeout. Please try again.',
            details: { context }
          };
        }
        return {
          type: 'CONNECTION_ERROR',
          message: 'Unable to connect. Please check your internet connection.',
          details: { context }
        };
      }

      // Server responded with error status
      const status = error.response.status;
      const data = error.response.data;

      // Handle structured API errors
      if (data?.error?.code && data?.error?.message) {
        return {
          type: data.error.code,
          message: data.error.message,
          details: data.error.details || context
        };
      }

      // Handle common HTTP status codes
      switch (status) {
        case 400:
          return {
            type: 'VALIDATION_ERROR',
            message: data?.message || 'Invalid request data.',
            details: data?.details || context
          };
        case 401:
          return {
            type: 'AUTH_ERROR',
            message: 'Please log in to continue.',
            details: context
          };
        case 403:
          return {
            type: 'PERMISSION_ERROR',
            message: 'You do not have permission to perform this action.',
            details: context
          };
        case 404:
          return {
            type: 'NOT_FOUND_ERROR',
            message: 'The requested resource was not found.',
            details: context
          };
        case 409:
          return {
            type: 'CONFLICT_ERROR',
            message: data?.message || 'A conflict occurred.',
            details: context
          };
        case 429:
          return {
            type: 'RATE_LIMIT_ERROR',
            message: 'Too many requests. Please try again later.',
            details: context
          };
        case 500:
          return {
            type: 'SERVER_ERROR',
            message: 'An internal server error occurred.',
            details: context
          };
        case 503:
          return {
            type: 'SERVICE_UNAVAILABLE',
            message: 'The service is temporarily unavailable.',
            details: context
          };
        default:
          return {
            type: 'HTTP_ERROR',
            message: data?.message || `Request failed with status ${status}`,
            details: { status, context }
          };
      }
    }

    return this.handleGenericError(error, context);
  }

  handleGenericError(error: any, context?: { [key: string]: any }): AppError {
    if (error instanceof Error) {
      return {
        type: 'GENERIC_ERROR',
        message: error.message,
        details: { context }
      };
    }

    return {
      type: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred.',
      details: { originalError: String(error), context }
    };
  }

  getUserFriendlyMessage(error: AppError): string {
    const suggestions: { [key: string]: string } = {
      CONNECTION_ERROR: 'Please check your internet connection and try again.',
      TIMEOUT_ERROR: 'The request is taking longer than usual. Please try again.',
      AUTH_ERROR: 'Please log in again.',
      PERMISSION_ERROR: 'You do not have permission to perform this action.',
      VALIDATION_ERROR: 'Please check your input and try again.',
      CONFLICT_ERROR: 'This action conflicts with existing data.',
      RATE_LIMIT_ERROR: 'Please wait a moment before trying again.',
      SERVER_ERROR: 'Something went wrong on our end. Please try again later.',
      SERVICE_UNAVAILABLE: 'The service is temporarily unavailable. Please try again later.',
    };

    return suggestions[error.type] || error.message;
  }

  getSuggestions(error: AppError): string[] {
    const suggestionMap: { [key: string]: string[] } = {
      CONNECTION_ERROR: [
        'Check your internet connection',
        'Try switching between Wi-Fi and cellular data',
        'Move to an area with better signal'
      ],
      TIMEOUT_ERROR: [
        'Try again in a few moments',
        'Check your internet connection',
        'The server might be experiencing high load'
      ],
      AUTH_ERROR: [
        'Please log in again',
        'Check if your session has expired',
        'Try logging out and back in'
      ],
      VALIDATION_ERROR: [
        'Double-check your input',
        'Make sure all required fields are filled',
        'Check the format of your data'
      ],
      SERVER_ERROR: [
        'Try again in a few minutes',
        'Contact support if the problem persists',
        'Check if there are any ongoing service issues'
      ]
    };

    return suggestionMap[error.type] || ['Please try again', 'Contact support if the problem persists'];
  }
}

export const errorService = ErrorService.getInstance();
