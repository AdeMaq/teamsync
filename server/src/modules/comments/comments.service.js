import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import { can } from '../../core/constants/permissions.js';
import * as commentsRepository from './comments.repository.js';

const idOf = (value) => String(value?._id ?? value); // works for ids and for populated documents

const commentNotFound = () => new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Comment not found');

// Only the author edits a comment. The author, or a workspace admin/owner (moderation), can delete it.
export const canEditComment = (comment, userId) => idOf(comment.author) === idOf(userId);
export const canDeleteComment = (workspaceRole, comment, userId) =>
  canEditComment(comment, userId) || can(workspaceRole, 'comment:delete');

// Needs the comment loaded with its author populated. `author` is null when that account no longer exists;
// the comment stays so the conversation still reads correctly.
const toComment = (comment, { role, userId }) => ({
  _id: comment.id,
  task: idOf(comment.task),
  workspace: idOf(comment.workspace),
  text: comment.text,
  author: comment.author?._id ? comment.author : null,
  editedAt: comment.editedAt ?? null,
  canEdit: canEditComment(comment, userId), // lets the screen hide buttons; the server checks again
  canDelete: canDeleteComment(role, comment, userId),
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
});

// ---- API used by the access middleware ----

export const findComment = (id) => commentsRepository.findCommentById(id);

// ---- Comments ----

export const createComment = async (task, ctx, { text }) => {
  const created = await commentsRepository.createComment({
    text,
    task: task.id,
    workspace: task.workspace,
    author: ctx.userId,
  });
  return toComment(await commentsRepository.findCommentByIdWithAuthor(created.id), ctx);
};

export const listComments = async (task, ctx, { page, limit }) => {
  const { comments, total } = await commentsRepository.listComments(task.id, { skip: (page - 1) * limit, limit });
  return { comments: comments.map((c) => toComment(c, ctx)), total, page, limit };
};

export const updateComment = async (comment, ctx, { text }) => {
  const updated = await commentsRepository.updateCommentText(comment.id, text);
  if (!updated) throw commentNotFound(); // deleted while editing
  return toComment(await commentsRepository.findCommentByIdWithAuthor(comment.id), ctx);
};

export const deleteComment = (comment) => commentsRepository.deleteCommentById(comment.id);

// ---- Clean-up after events from other modules (called by comments.events.js) ----

export const handleTasksDeleted = (taskIds) => commentsRepository.deleteCommentsByTasks(taskIds);

export const handleWorkspaceDeleted = (workspaceId) => commentsRepository.deleteCommentsByWorkspace(workspaceId);
