import asyncHandler from '../../core/utils/asyncHandler.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import * as commentsService from './comments.service.js';

// What the service needs to know about the caller. req.membership comes from the access middleware.
const contextOf = (req) => ({ role: req.membership.role, userId: req.user.id });

// Task-scoped routes (/tasks/:id/comments); req.task is set by requireTaskPermission ...

export const create = asyncHandler(async (req, res) => {
  const comment = await commentsService.createComment(req.task, contextOf(req), req.body);
  sendSuccess(res, { comment }, HTTP.CREATED);
});

export const list = asyncHandler(async (req, res) => {
  const result = await commentsService.listComments(req.task, contextOf(req), req.valid.query);
  sendSuccess(res, result);
});

// ... and comment routes (/comments/:id), where req.comment is set.

export const update = asyncHandler(async (req, res) => {
  const comment = await commentsService.updateComment(req.comment, contextOf(req), req.body);
  sendSuccess(res, { comment });
});

export const remove = asyncHandler(async (req, res) => {
  await commentsService.deleteComment(req.comment);
  sendSuccess(res, null);
});
