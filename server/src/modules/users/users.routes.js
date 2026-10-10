import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.middleware.js';
import * as usersController from './users.controller.js';

const router = Router();

router.get('/me', requireAuth, usersController.getMe);

export default router;
