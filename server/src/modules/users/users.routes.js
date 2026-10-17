import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { authLimiter } from '../../core/middleware/rateLimiter.middleware.js';
import { uploadAvatar } from '../../core/middleware/upload.middleware.js';
import {
  changeEmailSchema,
  changePasswordSchema,
  deleteAccountSchema,
  updateProfileSchema,
} from './users.validation.js';
import * as usersController from './users.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/me', usersController.getMe);
router.patch('/me', validate(updateProfileSchema), usersController.updateMe);

// Password-checking routes share the auth rate limit, so a stolen access token cannot brute-force the password.
router.patch('/me/email', authLimiter, validate(changeEmailSchema), usersController.changeEmail);
router.patch('/me/password', authLimiter, validate(changePasswordSchema), usersController.changePassword);
router.delete('/me', authLimiter, validate(deleteAccountSchema), usersController.deleteAccount);

router.post('/me/avatar', uploadAvatar, usersController.uploadAvatar);
router.delete('/me/avatar', usersController.removeAvatar);

export default router;
