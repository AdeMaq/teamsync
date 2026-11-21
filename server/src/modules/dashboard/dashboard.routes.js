import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { requireWorkspacePermission } from '../workspaces/index.js';
import { dashboardSchema } from './dashboard.validation.js';
import * as dashboardController from './dashboard.controller.js';

// /api/v1/workspaces/:workspaceId/dashboard  -> read-only numbers for the workspace's home screen
const dashboardRouter = Router({ mergeParams: true });

dashboardRouter.use(requireAuth);
dashboardRouter.get('/', validate(dashboardSchema), requireWorkspacePermission('workspace:view', 'workspaceId'), dashboardController.get);

export default dashboardRouter;
