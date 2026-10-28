import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { HTTP } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../errors/errorTypes.js';

// Brute-force protection for register / login / refresh and other password or token checks.
// Looser in development; effectively off in tests, which create hundreds of accounts from one address.
const LIMITS = { production: 20, development: 200, test: 100000 };

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: LIMITS[env.NODE_ENV] ?? LIMITS.production, // an unexpected environment name gets the strict limit
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(HTTP.TOO_MANY_REQUESTS).json({
      success: false,
      error: {
        code: ERROR_CODES.TOO_MANY_REQUESTS,
        message: 'Too many attempts. Please try again later.',
      },
    }),
});
