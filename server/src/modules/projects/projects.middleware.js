import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import { getMembership } from '../workspaces/index.js';
import * as projectsService from './projects.service.js';

// Guards the routes whose URL names a project (/projects/:id), where the workspace is not in the URL.
//
//   router.patch('/:id', requireAuth, requireProjectPermission('project:manage'), controller)
//
// It loads the project, finds the person's role in the project's workspace, and checks the action. Viewing needs
// workspace membership; managing needs the workspace admin/owner role or being the project's lead.
// Sets req.project and req.membership. Run requireAuth first, and validate() on the params for a clean 400.
export const requireProjectPermission = (action) => async (req, _res, next) => {
  try {
    const project = await projectsService.findProject(req.params.id);
    const access = project && (await getMembership(project.workspace, req.user.id));

    // Not a member of the project's workspace: same 404 as a project that does not exist.
    if (!access) {
      throw new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Project not found');
    }
    if (!projectsService.canOnProject(action, access.membership.role, project, req.user.id)) {
      throw new ApiError(HTTP.FORBIDDEN, ERROR_CODES.FORBIDDEN, 'Only the project lead or a workspace admin can do this');
    }

    req.project = project;
    req.membership = access.membership;
    next();
  } catch (err) {
    next(err);
  }
};
