/**
 * Rate limiting middleware for API endpoints.
 * Uses express-rate-limit for per-IP request throttling.
 */
import rateLimit from 'express-rate-limit';

/**
 * Standard API rate limit: 100 requests per minute
 */
export const standardApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

/**
 * Analytics-specific rate limit: 30 requests per minute
 * Analytics queries can be expensive, so we limit more aggressively.
 */
export const analyticsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many analytics requests. Please wait a moment and try again.' },
});

/**
 * Sync action rate limit: 10 requests per minute
 * Manual sync triggers and preference changes should be infrequent.
 */
export const syncActionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many sync requests. Please wait a moment.' },
});

/**
 * AI insights rate limit: 10 requests per minute
 * Insights generation is computationally expensive.
 */
export const insightsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many insight requests. Please wait a moment.' },
});
