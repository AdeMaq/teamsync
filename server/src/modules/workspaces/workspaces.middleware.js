import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import { can } from '../../core/constants/permissions.js';
import * as workspacesService from './workspaces.service.js';

// Role-based access control for anything inside a workspace.
//
//   router.patch('/:id', requireAuth, requireWorkspacePermission('workspace:update'), controller)
//
// It loads the workspace named in the URL, checks that the logged-in user is a member and that their role
// allows `action` (see core/constants/permissions.js), then sets req.workspace and req.membership.
// Other modules (projects, tasks, ...) reuse it with the URL parameter that holds the workspace id.
// Run requireAuth first, and validate() on the params so a malformed id gives a clean 400.
export const requireWorkspacePermission = (action, param = 'id') => async (req, _res, next) => {
  try {
    const workspace = await workspacesService.findWorkspace(req.params[param]);
    const membership = workspace && workspacesService.findMember(workspace, req.user.id);

    // Non-members get the same 404 as a workspace that does not exist, so ids cannot be probed.
    if (!membership) {
      throw new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Workspace not found');
    }
    if (!can(membership.role, action)) {
      throw new ApiError(HTTP.FORBIDDEN, ERROR_CODES.FORBIDDEN, 'You do not have permission to do this');
    }

    req.workspace = workspace;
    req.membership = membership;
    next();
  } catch (err) {
    next(err);
  }
};
