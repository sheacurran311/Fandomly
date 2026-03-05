/**
 * Standardized API error response utilities
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      ...(this.details ? { details: this.details } : {}),
    };
  }
}

// Factory functions for common errors
export const Errors = {
  badRequest: (message: string, details?: unknown) =>
    new ApiError(400, 'BAD_REQUEST', message, details),
  unauthorized: (message = 'Authentication required') => new ApiError(401, 'UNAUTHORIZED', message),
  forbidden: (message = 'Access denied') => new ApiError(403, 'FORBIDDEN', message),
  notFound: (resource = 'Resource') => new ApiError(404, 'NOT_FOUND', `${resource} not found`),
  conflict: (message: string) => new ApiError(409, 'CONFLICT', message),
  insufficientPoints: (required: number, available: number) =>
    new ApiError(400, 'INSUFFICIENT_POINTS', 'Insufficient points', { required, available }),
  outOfStock: (requested: number, available: number) =>
    new ApiError(400, 'OUT_OF_STOCK', 'Insufficient stock', { requested, available }),
  rateLimited: (retryAfter?: number) =>
    new ApiError(429, 'RATE_LIMITED', 'Too many requests', retryAfter ? { retryAfter } : undefined),
  internal: (message = 'Internal server error') => new ApiError(500, 'INTERNAL_ERROR', message),
};

/**
 * Express error handler middleware
 */
export function errorHandler(err: Error, _req: any, res: any, _next: any) {
  // Don't expose internal errors in production
  const isDev = process.env.NODE_ENV !== 'production';

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(err.toJSON());
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: (err as any).issues,
    });
  }

  // Database errors
  if ((err as any).code === '23505') {
    // Unique constraint violation
    return res.status(409).json({
      error: 'Resource already exists',
      code: 'DUPLICATE_ENTRY',
    });
  }

  // Generic error
  console.error('[API Error]', err);
  return res.status(500).json({
    error: isDev ? err.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
  });
}
