import { Router } from 'express';
import { validate } from '../../core/middleware/validate.middleware.js';
import { authLimiter } from '../../core/middleware/rateLimiter.middleware.js';
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from './auth.validation.js';
import * as authController from './auth.controller.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authLimiter, authController.refreshToken);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
// Public on purpose: logging out must work even when the access token has already expired.
router.post('/logout', authController.logout);

export default router;
