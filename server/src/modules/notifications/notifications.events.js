import logger from '../../config/logger.js';
import { eventBus } from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventNames.js';
import * as notificationsService from './notifications.service.js';

// A failed notification must never fail what caused it (assigning a task, posting a comment), so creating
// notifications is logged and swallowed. Clean-ups are not: a failed clean-up should fail loudly.
const safely = (name, handler) => async (payload) => {
  try {
    await handler(payload);
  } catch (err) {
    logger.error(`notifications: ${name} failed: ${err.message}`);
  }
};

eventBus.on(EVENTS.TASK_ASSIGNED, safely('task assigned', notificationsService.onTaskAssigned));
eventBus.on(EVENTS.COMMENT_ADDED, safely('comment added', notificationsService.onCommentAdded));
eventBus.on(EVENTS.COMMENT_MENTIONS_ADDED, safely('mentions added', notificationsService.onCommentAdded));

eventBus.on(EVENTS.WORKSPACE_DELETED, ({ workspaceId }) => notificationsService.handleWorkspaceDeleted(workspaceId));
eventBus.on(EVENTS.WORKSPACE_MEMBER_REMOVED, ({ workspaceId, userId }) =>
  notificationsService.handleMemberRemoved(workspaceId, userId)
);
eventBus.on(EVENTS.USER_DELETED, ({ userId }) => notificationsService.handleUserDeleted(userId));
eventBus.on(EVENTS.TASK_DELETED, ({ taskIds }) => notificationsService.handleTasksDeleted(taskIds));
