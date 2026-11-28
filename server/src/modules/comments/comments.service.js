import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import { can } from '../../core/constants/permissions.js';
import { eventBus } from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventNames.js';
import { findTaskForComments as findTask } from '../tasks/index.js';
import { getMemberProfiles } from '../workspaces/index.js';
import * as commentsRepository from './comments.repository.js';

const idOf = (value) => String(value?._id ?? value); // works for ids and for populated documents

const fieldError = (field, message) =>
  new ApiError(HTTP.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, message, [{ field, message }]);

// Everyone mentioned must belong to the comment's workspace.
const assertMentionable = async (workspaceId, mentions) => {
  if (!mentions?.length) return;
  const members = await getMemberProfiles(workspaceId);
  if (mentions.some((id) => !members[idOf(id)])) {
    throw fieldError('mentions', 'Only members of this workspace can be mentioned');
  }
};

const EXCERPT_LENGTH = 140;
const excerptOf = (text) => (text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH - 1)}…` : text);

// What notifications need to know about a comment and its task.
const commentEvent = (task, comment, mentionIds) => ({
  workspaceId: idOf(task.workspace),
  projectId: idOf(task.project),
  taskId: idOf(task._id ?? task.id),
  taskTitle: task.title,
  commentId: idOf(comment._id),
  authorId: idOf(comment.author),
  excerpt: excerptOf(comment.text),
  mentionIds: mentionIds.map(idOf),
});

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
  mentions: (comment.mentions ?? []).map(idOf),
  author: comment.author?._id ? comment.author : null,
  editedAt: comment.editedAt ?? null,
  canEdit: canEditComment(comment, userId), // lets the screen hide buttons; the server checks again
  canDelete: canDeleteComment(role, comment, userId),
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
});

// ---- API used by the access middleware ----

export const findComment = (id) => commentsRepository.findCommentById(id);

// For the dashboard (through comments/index.js): the newest comments of a workspace.
export const recentComments = async (workspaceId, limit) =>
  (await commentsRepository.recentComments(workspaceId, limit)).map((c) => ({
    taskId: String(c.task),
    userId: String(c.author),
    at: c.createdAt,
  }));

// ---- Comments ----

export const createComment = async (task, ctx, { text, mentions = [] }) => {
  await assertMentionable(task.workspace, mentions);

  const created = await commentsRepository.createComment({
    text,
    mentions,
    task: task.id,
    workspace: task.workspace,
    author: ctx.userId,
  });

  await eventBus.emit(EVENTS.COMMENT_ADDED, {
    ...commentEvent(task, created, mentions),
    followerIds: [task.createdBy, ...task.assignees].map(idOf),
  });

  return toComment(await commentsRepository.findCommentByIdWithAuthor(created.id), ctx);
};

export const listComments = async (task, ctx, { page, limit }) => {
  const { comments, total } = await commentsRepository.listComments(task.id, { skip: (page - 1) * limit, limit });
  return { comments: comments.map((c) => toComment(c, ctx)), total, page, limit };
};

// `task` is the comment's task (loaded by the route), for the notification of new mentions.
export const updateComment = async (comment, task, ctx, { text, mentions }) => {
  await assertMentionable(comment.workspace, mentions);

  const updated = await commentsRepository.updateComment(comment.id, { text, ...(mentions && { mentions }) });
  if (!updated) throw commentNotFound(); // deleted while editing

  // Only people who were not mentioned before hear about it, so fixing a typo does not notify everyone again.
  const before = new Set((comment.mentions ?? []).map(idOf));
  const added = (mentions ?? []).filter((id) => !before.has(idOf(id)));
  if (added.length && task) await eventBus.emit(EVENTS.COMMENT_MENTIONS_ADDED, commentEvent(task, updated, added));

  return toComment(await commentsRepository.findCommentByIdWithAuthor(comment.id), ctx);
};

// For the edit route: the task a comment belongs to (null if it was deleted meanwhile).
export const findTaskOf = (comment) => findTask(comment.task);

export const deleteComment = (comment) => commentsRepository.deleteCommentById(comment.id);

// ---- Clean-up after events from other modules (called by comments.events.js) ----

export const handleTasksDeleted = (taskIds) => commentsRepository.deleteCommentsByTasks(taskIds);

export const handleWorkspaceDeleted = (workspaceId) => commentsRepository.deleteCommentsByWorkspace(workspaceId);
