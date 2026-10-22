const rateLimit = require('express-rate-limit');
const { env } = require('../config/env');

/**
 * Default rate limiter for all API routes.
 */
const defaultLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS, // 15 minutes default
  max: env.RATE_LIMIT_MAX,            // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.',
  },
  skip: () => env.NODE_ENV === 'test',
});

/**
 * Stricter limiter for auth routes (login, register, refresh).
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 attempts per 15 min
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
  skip: () => env.NODE_ENV === 'test',
});

/**
 * Limiter for AI/voice endpoints (more expensive to run).
 */
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,             // 30 AI requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'AI request limit reached. Please slow down.',
  },
  skip: () => env.NODE_ENV === 'test',
});

module.exports = { defaultLimiter, authLimiter, aiLimiter };
