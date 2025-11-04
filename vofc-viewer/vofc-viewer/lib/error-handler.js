/**
 * Centralized Error Handling System
 * Provides consistent error handling, logging, and user feedback
 */

export class ErrorHandler {
  /**
   * Handle API errors with proper logging and user feedback
   */
  static handleApiError(error, context = '') {
    const timestamp = new Date().toISOString();
    const errorId = this.generateErrorId();
    
    // Log error details
    console.error(`[${timestamp}] API Error [${errorId}] in ${context}:`, {
      message: error.message,
      stack: error.stack,
      context,
      errorId
    });

    // Determine user-friendly message
    const userMessage = this.getUserFriendlyMessage(error);
    
    return {
      success: false,
      error: userMessage,
      errorId,
      timestamp
    };
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error, context = '') {
    const timestamp = new Date().toISOString();
    const errorId = this.generateErrorId();
    
    // Log authentication error
    console.error(`[${timestamp}] Auth Error [${errorId}] in ${context}:`, {
      message: error.message,
      context,
      errorId
    });

    // Don't expose sensitive authentication details
    return {
      success: false,
      error: 'Authentication failed',
      errorId,
      timestamp
    };
  }

  /**
   * Handle database errors
   */
  static handleDatabaseError(error, context = '') {
    const timestamp = new Date().toISOString();
    const errorId = this.generateErrorId();
    
    // Log database error
    console.error(`[${timestamp}] Database Error [${errorId}] in ${context}:`, {
      message: error.message,
      context,
      errorId
    });

    // Return generic database error message
    return {
      success: false,
      error: 'Database operation failed',
      errorId,
      timestamp
    };
  }

  /**
   * Handle validation errors
   */
  static handleValidationError(errors, context = '') {
    const timestamp = new Date().toISOString();
    const errorId = this.generateErrorId();
    
    console.warn(`[${timestamp}] Validation Error [${errorId}] in ${context}:`, {
      errors,
      context,
      errorId
    });

    return {
      success: false,
      error: 'Validation failed',
      details: errors,
      errorId,
      timestamp
    };
  }

  /**
   * Handle rate limiting errors
   */
  static handleRateLimitError(context = '') {
    const timestamp = new Date().toISOString();
    const errorId = this.generateErrorId();
    
    console.warn(`[${timestamp}] Rate Limit [${errorId}] in ${context}:`, {
      context,
      errorId
    });

    return {
      success: false,
      error: 'Too many requests. Please try again later.',
      errorId,
      timestamp
    };
  }

  /**
   * Generate unique error ID for tracking
   */
  static generateErrorId() {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error) {
    // Handle specific error types
    if (error.code === 'ENOTFOUND') {
      return 'Network connection failed. Please check your internet connection.';
    }
    
    if (error.code === 'ECONNREFUSED') {
      return 'Service temporarily unavailable. Please try again later.';
    }
    
    if (error.name === 'ValidationError') {
      return 'Invalid input provided. Please check your data and try again.';
    }
    
    if (error.name === 'UnauthorizedError') {
      return 'You are not authorized to perform this action.';
    }
    
    if (error.name === 'ForbiddenError') {
      return 'Access denied. You do not have permission for this action.';
    }
    
    // Generic fallback
    return 'An unexpected error occurred. Please try again later.';
  }

  /**
   * Log security events
   */
  static logSecurityEvent(event, details = {}) {
    const timestamp = new Date().toISOString();
    const eventId = this.generateErrorId();
    
    console.warn(`[${timestamp}] Security Event [${eventId}]:`, {
      event,
      details,
      eventId
    });

    // In production, this would be sent to a security monitoring system
    return eventId;
  }

  /**
   * Handle backup errors
   */
  static handleBackupError(error, context = '') {
    const timestamp = new Date().toISOString();
    const errorId = this.generateErrorId();
    
    console.error(`[${timestamp}] Backup Error [${errorId}] in ${context}:`, {
      message: error.message,
      context,
      errorId
    });

    return {
      success: false,
      error: 'Backup operation failed',
      errorId,
      timestamp
    };
  }

  /**
   * Create error response for API endpoints
   */
  static createErrorResponse(error, statusCode = 500, context = '') {
    const errorResponse = this.handleApiError(error, context);
    
    return {
      status: statusCode,
      body: errorResponse
    };
  }

  /**
   * Handle client-side errors
   */
  static handleClientError(error, context = '') {
    const timestamp = new Date().toISOString();
    const errorId = this.generateErrorId();
    
    console.error(`[${timestamp}] Client Error [${errorId}] in ${context}:`, {
      message: error.message,
      stack: error.stack,
      context,
      errorId
    });

    // Show user-friendly message
    const userMessage = this.getUserFriendlyMessage(error);
    
    return {
      success: false,
      error: userMessage,
      errorId
    };
  }
}

export default ErrorHandler;

