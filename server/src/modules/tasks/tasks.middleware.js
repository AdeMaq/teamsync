import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import { can } from '../../core/constants/permissions.js';
import { getMembership } from '../workspaces/index.js';
import * as tasksService from './tasks.service.js';

// Guards the routes whose URL names a task (/tasks/:id), where neither the project nor the workspace is in the URL.
//
//   router.patch('/:id', requireAuth, requireTaskPermission('task:update'), controller)
//
// It loads the task and its project, finds the person's role in the task's workspace, and checks the action.
// Deleting is allowed for admins/owner, the project's lead, and the task's creator.
// Sets req.task, req.project and req.membership. Run requireAuth first, and validate() on the params for a clean 400.
export const requireTaskPermission = (action) => async (req, _res, next) => {
  try {
    const task = await tasksService.findTask(req.params.id);
    const access = task && (await getMembership(task.workspace, req.user.id));
    const project = access && (await tasksService.loadProjectOf(task));

    // Not a member of the task's workspace: same 404 as a task that does not exist.
    if (!access || !project) {
      throw new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Task not found');
    }

    const role = access.membership.role;
    const allowed =
      action === 'task:delete' ? tasksService.canDeleteTask(role, project, task, req.user.id) : can(role, action);
    if (!allowed) {
      throw new ApiError(HTTP.FORBIDDEN, ERROR_CODES.FORBIDDEN, 'Only the task creator, the project lead or a workspace admin can do this');
    }

    req.task = task;
    req.project = project;
    req.membership = access.membership;
    next();
  } catch (err) {
    next(err);
  }
};
