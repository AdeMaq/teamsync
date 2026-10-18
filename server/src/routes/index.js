import { Router } from 'express';
import { authRoutes } from '../modules/auth/index.js';
import { usersRoutes } from '../modules/users/index.js';
import { workspacesRoutes } from '../modules/workspaces/index.js';

// Mounted at /api/v1 by app.js.
const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/workspaces', workspacesRoutes);

export default router;
