import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { requireTaskPermission } from '../tasks/index.js';
import { requireCommentPermission } from './comments.middleware.js';
import { createCommentSchema, idParams, listCommentsSchema, updateCommentSchema } from './comments.validation.js';
import * as commentsController from './comments.controller.js';

// /api/v1/tasks/:id/comments  -> creating and listing; the task is in the URL
export const taskCommentsRouter = Router({ mergeParams: true });

taskCommentsRouter.use(requireAuth);
taskCommentsRouter.post('/', validate(createCommentSchema), requireTaskPermission('comment:create'), commentsController.create);
taskCommentsRouter.get('/', validate(listCommentsSchema), requireTaskPermission('comment:view'), commentsController.list);

// /api/v1/comments/:id  -> one comment; requireCommentPermission finds the workspace through the comment
export const commentsRouter = Router();

commentsRouter.use(requireAuth);
commentsRouter.patch('/:id', validate(updateCommentSchema), requireCommentPermission('edit'), commentsController.update);
commentsRouter.delete('/:id', validate(idParams), requireCommentPermission('delete'), commentsController.remove);
