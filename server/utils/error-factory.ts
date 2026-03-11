/**
 * Error Factory - Standardized error response handling
 * Provides consistent error responses across all API routes
 */

import { Response } from 'express';
import { Sentry } from '../lib/sentry';

// Standard error codes
export enum ErrorCode {
  // Authentication & Authorization (401-403)
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Validation (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Resource errors (404, 409)
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Server errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

// Status code mapping
const statusCodeMap: Record<ErrorCode, number> = {
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.SESSION_EXPIRED]: 401,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
};

// Standard error response format
export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>[];
    requestId?: string;
  };
}

// Custom error classes
export class AppError extends Error {
  code: ErrorCode;
  details?: Record<string, unknown>[];
  statusCode: number;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>[]) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    this.statusCode = statusCodeMap[code];
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>[]) {
    super(ErrorCode.VALIDATION_ERROR, message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID '${id}' not found` : `${resource} not found`;
    super(ErrorCode.NOT_FOUND, message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(ErrorCode.FORBIDDEN, message);
    this.name = 'ForbiddenError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(ErrorCode.UNAUTHORIZED, message);
    this.name = 'UnauthorizedError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(ErrorCode.CONFLICT, message);
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(ErrorCode.RATE_LIMIT_EXCEEDED, message);
    this.name = 'RateLimitError';
  }
}

// Response helpers
export function sendError(res: Response, error: AppError): Response {
  const response: ApiError = {
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
    },
  };

  return res.status(error.statusCode).json(response);
}

export function sendValidationError(
  res: Response,
  message: string,
  details?: Record<string, unknown>[]
): Response {
  return sendError(res, new ValidationError(message, details));
}

export function sendNotFoundError(res: Response, resource: string, id?: string): Response {
  return sendError(res, new NotFoundError(resource, id));
}

export function sendForbiddenError(res: Response, message?: string): Response {
  return sendError(res, new ForbiddenError(message));
}

export function sendUnauthorizedError(res: Response, message?: string): Response {
  return sendError(res, new UnauthorizedError(message));
}

export function sendConflictError(res: Response, message: string): Response {
  return sendError(res, new ConflictError(message));
}

export function sendInternalError(
  res: Response,
  message: string = 'An internal error occurred'
): Response {
  const error = new AppError(ErrorCode.INTERNAL_ERROR, message);
  console.error('[Internal Error]', message);
  Sentry.captureMessage(message, 'error');
  return sendError(res, error);
}

// Express error handling middleware
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  req: { method?: string; originalUrl?: string; url?: string; user?: { id?: string } },
  res: Response,
  _next: unknown
) {
  // Log the error
  console.error('[Error Handler]', err);

  // Report to Sentry (skip expected client errors like 4xx)
  if (!(err instanceof AppError) || err.statusCode >= 500) {
    Sentry.captureException(err, {
      extra: {
        method: req.method,
        url: req.originalUrl || req.url,
        userId: req.user?.id,
      },
    });
  }

  // If it's our custom AppError, use it directly
  if (err instanceof AppError) {
    return sendError(res, err);
  }

  // Cast to object for property checks on non-AppError errors
  const e = err as Record<string, unknown>;

  // Zod validation errors
  if (e.name === 'ZodError' && Array.isArray(e.errors)) {
    const details = e.errors.map((item: Record<string, unknown>) => ({
      path: Array.isArray(item.path) ? item.path.join('.') : '',
      message: String(item.message ?? ''),
    }));
    return sendValidationError(res, 'Validation failed', details);
  }

  // JSON parsing errors
  if (e.type === 'entity.parse.failed') {
    return sendValidationError(res, 'Invalid JSON in request body');
  }

  // Multer file upload errors
  if (e.code === 'LIMIT_FILE_SIZE') {
    return sendValidationError(res, 'File size exceeds limit');
  }

  // Database errors
  if (typeof e.code === 'string' && e.code.startsWith('23')) {
    if (e.code === '23505') {
      // Unique violation
      return sendConflictError(res, 'A record with this value already exists');
    }
    if (e.code === '23503') {
      // Foreign key violation
      return sendValidationError(res, 'Referenced record does not exist');
    }
  }

  // Default to internal error
  const message =
    process.env.NODE_ENV === 'development' && err instanceof Error
      ? err.message
      : 'An internal error occurred';
  return sendInternalError(res, message);
}

// Success response helper
export interface ApiSuccess<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    hasMore?: boolean;
  };
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: ApiSuccess<T>['meta']
): Response {
  const response: ApiSuccess<T> = { data };
  if (meta) {
    response.meta = meta;
  }
  return res.status(statusCode).json(response);
}

export function sendCreated<T>(res: Response, data: T): Response {
  return sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send();
}
