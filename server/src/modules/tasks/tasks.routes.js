import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { requireWorkspacePermission } from '../workspaces/index.js';
import { requireProjectPermission } from '../projects/index.js';
import { requireTaskPermission } from './tasks.middleware.js';
import {
  createTaskSchema,
  idParams,
  listTasksSchema,
  moveTaskSchema,
  updateTaskSchema,
  workspaceCountsSchema,
} from './tasks.validation.js';
import * as tasksController from './tasks.controller.js';

// /api/v1/projects/:id/tasks  -> creating and listing; the project is in the URL
export const projectTasksRouter = Router({ mergeParams: true });

projectTasksRouter.use(requireAuth);
projectTasksRouter.post('/', validate(createTaskSchema), requireProjectPermission('task:create'), tasksController.create);
projectTasksRouter.get('/', validate(listTasksSchema), requireProjectPermission('task:view'), tasksController.list);

// /api/v1/workspaces/:workspaceId/task-counts  -> task totals per project and column, for project cards
export const workspaceTaskCountsRouter = Router({ mergeParams: true });

workspaceTaskCountsRouter.use(requireAuth);
workspaceTaskCountsRouter.get(
  '/',
  validate(workspaceCountsSchema),
  requireWorkspacePermission('task:view', 'workspaceId'),
  tasksController.counts
);

// /api/v1/tasks/:id  -> one task; requireTaskPermission finds the project and workspace through the task
export const tasksRouter = Router();

tasksRouter.use(requireAuth);
tasksRouter.get('/:id', validate(idParams), requireTaskPermission('task:view'), tasksController.get);
tasksRouter.patch('/:id', validate(updateTaskSchema), requireTaskPermission('task:update'), tasksController.update);
tasksRouter.post('/:id/move', validate(moveTaskSchema), requireTaskPermission('task:update'), tasksController.move);
tasksRouter.delete('/:id', validate(idParams), requireTaskPermission('task:delete'), tasksController.remove);
