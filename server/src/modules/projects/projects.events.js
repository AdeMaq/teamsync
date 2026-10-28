import { eventBus } from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventNames.js';
import * as projectsService from './projects.service.js';

// A deleted workspace takes its projects with it.
eventBus.on(EVENTS.WORKSPACE_DELETED, ({ workspaceId }) => projectsService.handleWorkspaceDeleted(workspaceId));

// People who leave, are removed, or delete their account stop leading projects.
eventBus.on(EVENTS.USER_DELETED, ({ userId }) => projectsService.handleUserDeleted(userId));
eventBus.on(EVENTS.WORKSPACE_MEMBER_REMOVED, ({ workspaceId, userId }) =>
  projectsService.handleMemberRemoved(workspaceId, userId)
);
