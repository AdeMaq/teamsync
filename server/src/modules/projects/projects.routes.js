import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { requireWorkspacePermission } from '../workspaces/index.js';
import { requireProjectPermission } from './projects.middleware.js';
import { createProjectSchema, idParams, listProjectsSchema, updateProjectSchema } from './projects.validation.js';
import * as projectsController from './projects.controller.js';

// /api/v1/workspaces/:workspaceId/projects  -> creating and listing; the workspace is in the URL
export const workspaceProjectsRouter = Router({ mergeParams: true });

workspaceProjectsRouter.use(requireAuth);
workspaceProjectsRouter.post(
  '/',
  validate(createProjectSchema),
  requireWorkspacePermission('project:create', 'workspaceId'),
  projectsController.create
);
workspaceProjectsRouter.get(
  '/',
  validate(listProjectsSchema),
  requireWorkspacePermission('project:view', 'workspaceId'),
  projectsController.list
);

// /api/v1/projects/:id  -> one project; requireProjectPermission finds the workspace through the project
export const projectsRouter = Router();

projectsRouter.use(requireAuth);
projectsRouter.get('/:id', validate(idParams), requireProjectPermission('project:view'), projectsController.get);
projectsRouter.patch(
  '/:id',
  validate(updateProjectSchema),
  requireProjectPermission('project:manage'),
  projectsController.update
);
projectsRouter.delete('/:id', validate(idParams), requireProjectPermission('project:manage'), projectsController.remove);
