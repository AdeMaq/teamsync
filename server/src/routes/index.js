import { Router } from 'express';
import { authRoutes } from '../modules/auth/index.js';
import { usersRoutes } from '../modules/users/index.js';
import { projectsRouter, workspaceProjectsRouter } from '../modules/projects/index.js';
import { projectTasksRouter, tasksRouter, workspaceTaskCountsRouter } from '../modules/tasks/index.js';
import { commentsRouter, taskCommentsRouter } from '../modules/comments/index.js';
import { workspacesRoutes } from '../modules/workspaces/index.js';

// Mounted at /api/v1 by app.js.
const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/workspaces/:workspaceId/projects', workspaceProjectsRouter);
router.use('/workspaces/:workspaceId/task-counts', workspaceTaskCountsRouter);
router.use('/workspaces', workspacesRoutes);
router.use('/projects/:id/tasks', projectTasksRouter);
router.use('/projects', projectsRouter);
router.use('/tasks/:id/comments', taskCommentsRouter);
router.use('/tasks', tasksRouter);
router.use('/comments', commentsRouter);

export default router;
