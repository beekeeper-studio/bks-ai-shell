/**
 * Centralized error handling utilities
 */

// Standard error response structure
export interface IErrorResponse {
  message: string;
  code?: string;
  details?: any;
}

// Error types
export enum ErrorType {
  API_ERROR = 'API_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string,
  type: ErrorType = ErrorType.UNKNOWN_ERROR,
  details?: any
): IErrorResponse {
  // Log error for debugging
  console.error(`[${type}] ${message}`, details);
  
  return {
    message,
    code: type,
    details
  };
}

/**
 * Handle API errors in a consistent way
 */
export function handleApiError(error: any): IErrorResponse {
  // Handle different error types
  if (error?.response) {
    // API response error
    return createErrorResponse(
      error.response.data?.message || 'API request failed',
      ErrorType.API_ERROR,
      { status: error.response.status, data: error.response.data }
    );
  } else if (error?.request) {
    // Network error
    return createErrorResponse(
      'Network error, please check your connection',
      ErrorType.NETWORK_ERROR
    );
  } else if (error?.message?.includes('authentication')) {
    // Auth error
    return createErrorResponse(
      'Authentication failed. Please check your API key',
      ErrorType.AUTHENTICATION_ERROR
    );
  }
  
  // Generic error
  return createErrorResponse(
    error?.message || 'An unknown error occurred',
    ErrorType.UNKNOWN_ERROR,
    error
  );
}

/**
 * Format error for API response
 */
export function formatApiError<T>(error: any): { success: false; error: string; details?: any } {
  const errorResponse = handleApiError(error);
  
  return {
    success: false,
    error: errorResponse.message,
    details: errorResponse.details
  };
}