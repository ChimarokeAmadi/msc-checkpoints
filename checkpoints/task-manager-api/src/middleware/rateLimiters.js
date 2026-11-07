// Basic rate limiting with express-rate-limit.
// The login limiter is strict, to slow down people trying to guess passwords.

const { rateLimit } = require('express-rate-limit');
const AppError = require('../utils/AppError');

const handler = (req, res, next, options) => {
  next(new AppError(options.message, options.statusCode));
};

function createLimiters({ authMax = 5, apiMax = 100, windowMs = 15 * 60 * 1000 } = {}) {
  return {
    // Login and signup: 5 attempts per 15 minutes per IP
    authLimiter: rateLimit({
      windowMs,
      limit: authMax,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      skipSuccessfulRequests: true, // only failed attempts count
      message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
      statusCode: 429,
      handler,
    }),
    // Everything else: 100 requests per 15 minutes per IP
    apiLimiter: rateLimit({
      windowMs,
      limit: apiMax,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: 'Too many requests from this IP. Please try again later.',
      statusCode: 429,
      handler,
    }),
  };
}

module.exports = { createLimiters };
