import rateLimit from 'express-rate-limit';
import { env } from '../../config/env.js';
import { HTTP } from '../constants/httpStatusCodes.js';
import { ERROR_CODES } from '../errors/errorTypes.js';

// Brute-force protection for register / login / refresh. Looser outside production.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'production' ? 20 : 200,
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
