import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import { getMemberProfiles } from '../workspaces/index.js';
import * as notificationsRepository from './notifications.repository.js';

const idOf = (value) => String(value?._id ?? value);

const notificationNotFound = () => new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Notification not found');

// Where a notification about a task takes you: the project's board, with the task named so the screen can open it.
const taskLink = (projectId, taskId) => `/projects/${projectId}?task=${taskId}`;

// `sender` is null when that account no longer exists.
const toNotification = (n) => ({
  _id: n.id,
  type: n.type,
  title: n.title,
  message: n.message,
  link: n.link,
  isRead: n.isRead,
  workspace: n.workspace ? idOf(n.workspace) : null,
  sender: n.sender?._id ? { _id: idOf(n.sender), name: n.sender.name, avatar: n.sender.avatar ?? '' } : null,
  meta: n.meta ?? {},
  createdAt: n.createdAt,
});

// ---- Reading and managing your own notifications ----

export const listNotifications = async (userId, { unread, page, limit }) => {
  const [{ notifications, total }, unreadCount] = await Promise.all([
    notificationsRepository.listForRecipient(userId, { unread }, { skip: (page - 1) * limit, limit }),
    notificationsRepository.countUnread(userId),
  ]);
  return { notifications: notifications.map(toNotification), total, unreadCount, page, limit };
};

export const unreadCount = (userId) => notificationsRepository.countUnread(userId);

export const markRead = async (userId, id) => {
  const notification = await notificationsRepository.markRead(id, userId);
  if (!notification) throw notificationNotFound(); // missing, or someone else's: same answer
  return toNotification(notification);
};

export const markAllRead = async (userId) => {
  const result = await notificationsRepository.markAllRead(userId);
  return result.modifiedCount;
};

export const deleteNotification = async (userId, id) => {
  const { deletedCount } = await notificationsRepository.deleteOne(id, userId);
  if (!deletedCount) throw notificationNotFound();
};

// ---- Creating notifications (called by notifications.events.js) ----

// Sends one notification to each recipient who is still a member of the workspace, never to the person who
// caused it, and at most one per person per event.
const notify = async ({ workspaceId, actorId, recipients, type, title, message, link, meta }) => {
  const members = await getMemberProfiles(workspaceId);
  const ids = [...new Set(recipients.map(idOf))].filter((id) => id !== idOf(actorId) && members[id]);
  if (!ids.length) return [];

  return notificationsRepository.createMany(
    ids.map((recipient) => ({ recipient, sender: actorId, workspace: workspaceId, type, title, message, link, meta }))
  );
};

export const onTaskAssigned = ({ workspaceId, projectId, taskId, taskTitle, assigneeId, actorId }) =>
  notify({
    workspaceId,
    actorId,
    recipients: [assigneeId],
    type: 'task_assigned',
    title: taskTitle,
    message: 'assigned you a task',
    link: taskLink(projectId, taskId),
    meta: { taskId, projectId },
  });

// Mentioned people get a "mention"; the task's creator and assignees get a "comment" (unless also mentioned).
export const onCommentAdded = async ({ followerIds = [], mentionIds, authorId, ...event }) => {
  const mentioned = new Set(mentionIds);
  const common = {
    workspaceId: event.workspaceId,
    actorId: authorId,
    title: event.taskTitle,
    message: event.excerpt,
    link: taskLink(event.projectId, event.taskId),
    meta: { taskId: event.taskId, projectId: event.projectId, commentId: event.commentId },
  };

  await notify({ ...common, recipients: mentionIds, type: 'mention' });
  await notify({ ...common, recipients: followerIds.filter((id) => !mentioned.has(id)), type: 'comment' });
};

// ---- Clean-up after events from other modules ----

export const handleWorkspaceDeleted = (workspaceId) => notificationsRepository.deleteByWorkspace(workspaceId);

export const handleMemberRemoved = (workspaceId, userId) =>
  notificationsRepository.deleteForMemberOfWorkspace(workspaceId, userId);

export const handleUserDeleted = (userId) => notificationsRepository.deleteForRecipient(userId);

export const handleTasksDeleted = (taskIds) => notificationsRepository.deleteByTasks(taskIds);
