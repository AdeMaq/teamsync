import { Router } from 'express';
import { requireAuth } from '../../core/middleware/auth.middleware.js';
import { validate } from '../../core/middleware/validate.middleware.js';
import { idParams, listNotificationsSchema } from './notifications.validation.js';
import * as notificationsController from './notifications.controller.js';

// /api/v1/notifications  -> the logged-in person's own notifications, across all their workspaces
const notificationsRouter = Router();

notificationsRouter.use(requireAuth);
notificationsRouter.get('/', validate(listNotificationsSchema), notificationsController.list);
notificationsRouter.get('/unread-count', notificationsController.unreadCount);
notificationsRouter.post('/read-all', notificationsController.markAllRead);
notificationsRouter.patch('/:id/read', validate(idParams), notificationsController.markRead);
notificationsRouter.delete('/:id', validate(idParams), notificationsController.remove);

export default notificationsRouter;
