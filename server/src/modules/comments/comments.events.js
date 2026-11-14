import { eventBus } from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventNames.js';
import * as commentsService from './comments.service.js';

// Comments belong to tasks: a deleted task (or all tasks of a deleted project) takes its comments with it.
eventBus.on(EVENTS.TASK_DELETED, ({ taskIds }) => commentsService.handleTasksDeleted(taskIds));
// A deleted workspace removes its tasks without a TASK_DELETED, so its comments go here.
eventBus.on(EVENTS.WORKSPACE_DELETED, ({ workspaceId }) => commentsService.handleWorkspaceDeleted(workspaceId));
// A deleted account keeps its comments (shown without an author) so conversations stay readable.
