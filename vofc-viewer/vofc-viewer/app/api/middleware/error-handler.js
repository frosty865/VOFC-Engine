/**
 * Error Handling Middleware for API Routes
 * Standardizes error responses
 */

import { NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(status, message, details = null) {
    super(message);
    this.status = status;
    this.details = details;
    this.name = 'ApiError';
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error, context = '') {
  console.error(`[API Error${context ? `: ${context}` : ''}]`, error);
  
  // If it's already an ApiError, use it
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.details,
        timestamp: new Date().toISOString(),
      },
      { status: error.status }
    );
  }
  
  // Handle known error types
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Request timeout',
        message: 'The request took too long to complete',
        timestamp: new Date().toISOString(),
      },
      { status: 504 }
    );
  }
  
  if (error.message?.includes('fetch failed') || error.message?.includes('ECONNREFUSED')) {
    return NextResponse.json(
      {
        success: false,
        error: 'Service unavailable',
        message: 'Unable to connect to required service',
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
  
  // Generic error
  return NextResponse.json(
    {
      success: false,
      error: error.message || 'Internal server error',
      timestamp: new Date().toISOString(),
    },
    { status: 500 }
  );
}

/**
 * Wrap async route handler with error handling
 */
export function withErrorHandling(handler, context = '') {
  return async (request, ...args) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      return handleApiError(error, context);
    }
  };
}

