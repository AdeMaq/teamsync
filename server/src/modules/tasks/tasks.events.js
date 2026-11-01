import { eventBus } from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventNames.js';
import * as tasksService from './tasks.service.js';

// A deleted project, or a deleted workspace, takes its tasks with it.
eventBus.on(EVENTS.PROJECT_DELETED, ({ projectId }) => tasksService.handleProjectDeleted(projectId));
eventBus.on(EVENTS.WORKSPACE_DELETED, ({ workspaceId }) => tasksService.handleWorkspaceDeleted(workspaceId));

// People who leave, are removed, or delete their account stop being assigned to tasks.
eventBus.on(EVENTS.USER_DELETED, ({ userId }) => tasksService.handleUserDeleted(userId));
eventBus.on(EVENTS.WORKSPACE_MEMBER_REMOVED, ({ workspaceId, userId }) =>
  tasksService.handleMemberRemoved(workspaceId, userId)
);
