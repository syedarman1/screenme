import { NextResponse } from 'next/server';

export interface ErrorDetails {
  message: string;
  action?: string;
  code: string;
  retryAfter?: number; // for rate limiting
}

export interface StandardErrorResponse {
  error: string;
  details?: ErrorDetails;
  timestamp: string;
  requestId?: string;
}

export class APIError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly action?: string;
  public readonly retryAfter?: number;

  constructor(message: string, code: string, status: number, action?: string, retryAfter?: number) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
    this.action = action;
    this.retryAfter = retryAfter;
  }
}

export function createErrorResponse(
  message: string,
  code: string,
  status: number,
  action?: string,
  retryAfter?: number
): NextResponse {
  const errorResponse: StandardErrorResponse = {
    error: message,
    details: {
      message,
      code,
      action,
      retryAfter,
    },
    timestamp: new Date().toISOString(),
  };

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (retryAfter) {
    headers['Retry-After'] = retryAfter.toString();
  }

  return NextResponse.json(errorResponse, { status, headers });
}

// Predefined error types for consistency
export const ErrorTypes = {
  // Validation Errors (400)
  INVALID_INPUT: (field: string, requirement: string) => 
    new APIError(
      `${field} ${requirement}`,
      'INVALID_INPUT',
      400,
      `Please check your ${field.toLowerCase()} and try again.`
    ),

  CONTENT_TOO_SHORT: (type: string, minLength: number, suggestion: string) =>
    new APIError(
      `${type} must be at least ${minLength} characters. ${suggestion}`,
      'CONTENT_TOO_SHORT',
      400,
      `Add more details to your ${type.toLowerCase()} and resubmit.`
    ),

  MISSING_REQUIRED_FIELDS: (fields: string[]) =>
    new APIError(
      `Missing required fields: ${fields.join(', ')}`,
      'MISSING_REQUIRED_FIELDS',
      400,
      'Please fill in all required fields and try again.'
    ),

  // Rate Limiting (429)
  RATE_LIMIT_EXCEEDED: (retryMinutes: number) =>
    new APIError(
      `Too many requests. Please wait ${retryMinutes} minutes before trying again.`,
      'RATE_LIMIT_EXCEEDED',
      429,
      'Try reducing the frequency of your requests.',
      retryMinutes * 60
    ),

  USAGE_LIMIT_REACHED: (feature: string, plan: string) =>
    new APIError(
      `Usage limit reached. You've used all ${feature} for this month.`,
      'USAGE_LIMIT_REACHED',
      429,
      plan === 'free' ? 'Upgrade to Pro for unlimited access.' : 'Contact support if you need additional usage.'
    ),

  // External Service Errors (500)
  OPENAI_SERVICE_ERROR: () =>
    new APIError(
      'AI analysis temporarily unavailable. Please try again in a few moments.',
      'OPENAI_SERVICE_ERROR',
      500,
      'Wait a moment and retry your request.'
    ),

  TRANSCRIPTION_FAILED: () =>
    new APIError(
      'Could not process audio. Please speak clearly and ensure good audio quality.',
      'TRANSCRIPTION_FAILED',
      500,
      'Try recording again with clearer audio.'
    ),

  // General Server Errors (500)
  PROCESSING_ERROR: (operation: string) =>
    new APIError(
      `Failed to ${operation}. Please try again.`,
      'PROCESSING_ERROR',
      500,
      'Refresh the page and try again. If the problem persists, contact support.'
    ),

  USAGE_TRACKING_ERROR: () =>
    new APIError(
      'Could not verify usage limits. Please try again.',
      'USAGE_TRACKING_ERROR',
      500,
      'Refresh the page and retry your request.'
    ),

  // JSON/Schema Errors (500)
  INVALID_RESPONSE_FORMAT: () =>
    new APIError(
      'Received invalid response format. Please try again.',
      'INVALID_RESPONSE_FORMAT',
      500,
      'This is likely a temporary issue. Please try again.'
    ),
} as const;

export function handleAPIError(error: unknown): NextResponse {
  if (error instanceof APIError) {
    return createErrorResponse(
      error.message,
      error.code,
      error.status,
      error.action,
      error.retryAfter
    );
  }

  // Handle OpenAI specific errors
  if (error instanceof Error) {
    if (error.message.includes('rate limit') || error.message.includes('quota')) {
      const rateLimitError = ErrorTypes.OPENAI_SERVICE_ERROR();
      return createErrorResponse(
        rateLimitError.message,
        rateLimitError.code,
        rateLimitError.status,
        rateLimitError.action
      );
    }

    if (error.message.includes('timeout') || error.message.includes('network')) {
      const timeoutError = ErrorTypes.OPENAI_SERVICE_ERROR();
      return createErrorResponse(
        timeoutError.message,
        timeoutError.code,
        timeoutError.status,
        timeoutError.action
      );
    }
  }

  // Default server error
  console.error('Unhandled API error:', error);
  const defaultError = ErrorTypes.PROCESSING_ERROR('process your request');
  return createErrorResponse(
    defaultError.message,
    defaultError.code,
    defaultError.status,
    defaultError.action
  );
}

// Utility function to validate request size and format
export function validateRequest(body: any, requiredFields: string[]): APIError | null {
  // Check for missing required fields
  const missingFields = requiredFields.filter(field => 
    !body[field] || (typeof body[field] === 'string' && !body[field].trim())
  );

  if (missingFields.length > 0) {
    return ErrorTypes.MISSING_REQUIRED_FIELDS(missingFields);
  }

  return null;
}

// Utility to check content length requirements
export function validateContentLength(
  content: string, 
  type: string, 
  minLength: number, 
  suggestion: string
): APIError | null {
  if (content.trim().length < minLength) {
    return ErrorTypes.CONTENT_TOO_SHORT(type, minLength, suggestion);
  }
  return null;
}