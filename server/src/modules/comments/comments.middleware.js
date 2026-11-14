import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import { getMembership } from '../workspaces/index.js';
import * as commentsService from './comments.service.js';

// Guards the routes whose URL names a comment (/comments/:id). `action` is 'edit' or 'delete'.
// Finds the person's role in the comment's workspace; non-members get the same 404 as a missing comment.
// Sets req.comment and req.membership. Run requireAuth first, and validate() on the params for a clean 400.
export const requireCommentPermission = (action) => async (req, _res, next) => {
  try {
    const comment = await commentsService.findComment(req.params.id);
    const access = comment && (await getMembership(comment.workspace, req.user.id));
    if (!access) throw new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Comment not found');

    const role = access.membership.role;
    const allowed =
      action === 'edit'
        ? commentsService.canEditComment(comment, req.user.id)
        : commentsService.canDeleteComment(role, comment, req.user.id);
    if (!allowed) {
      throw new ApiError(
        HTTP.FORBIDDEN,
        ERROR_CODES.FORBIDDEN,
        action === 'edit' ? 'Only the author can edit a comment' : 'Only the author or a workspace admin can delete a comment'
      );
    }

    req.comment = comment;
    req.membership = access.membership;
    next();
  } catch (err) {
    next(err);
  }
};
