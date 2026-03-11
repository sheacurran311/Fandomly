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
  validate: { xForwardedForHeader: false },
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
  validate: { xForwardedForHeader: false },
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
  validate: { xForwardedForHeader: false },
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
  validate: { xForwardedForHeader: false },
  message: { error: 'Too many insight requests. Please wait a moment.' },
});

/**
 * Auth rate limit: 20 requests per minute per IP
 * Prevents brute-force login attempts and account enumeration.
 * Higher limit than default to account for Particle auth retry flows.
 */
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'Too many authentication attempts. Please try again later.' },
});

/**
 * Transaction rate limit: 10 requests per minute per IP
 * Applies to reward redemptions, staking, NFT minting — operations
 * that cost points or trigger on-chain transactions.
 */
export const transactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'Too many transaction requests. Please wait a moment and try again.' },
});

/**
 * Public endpoint rate limit: 60 requests per minute per IP
 * Applies to unauthenticated public routes (referral click tracking,
 * public creator/program pages) to prevent abuse and scraping.
 */
export const publicEndpointLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { xForwardedForHeader: false },
  message: { error: 'Too many requests. Please try again later.' },
});
