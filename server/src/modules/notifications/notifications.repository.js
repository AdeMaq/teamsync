import Notification from './notifications.model.js';

// Only these fields of the sender are ever loaded for display.
const PERSON_FIELDS = 'name avatar';

export const createMany = (docs) => Notification.insertMany(docs);

// Always limited to one recipient: nobody can read or change someone else's notifications.
export const listForRecipient = async (recipientId, { unread }, { skip, limit }) => {
  const filter = { recipient: recipientId, ...(unread && { isRead: false }) };
  const [notifications, total] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).populate('sender', PERSON_FIELDS),
    Notification.countDocuments(filter),
  ]);
  return { notifications, total };
};

export const countUnread = (recipientId) => Notification.countDocuments({ recipient: recipientId, isRead: false });

export const markRead = (id, recipientId) =>
  Notification.findOneAndUpdate({ _id: id, recipient: recipientId }, { $set: { isRead: true } }, { returnDocument: 'after' }).populate(
    'sender',
    PERSON_FIELDS
  );

export const markAllRead = (recipientId) =>
  Notification.updateMany({ recipient: recipientId, isRead: false }, { $set: { isRead: true } });

export const deleteOne = (id, recipientId) => Notification.deleteOne({ _id: id, recipient: recipientId });

// ---- Cleanup after other modules' events ----

export const deleteByWorkspace = (workspaceId) => Notification.deleteMany({ workspace: workspaceId });

export const deleteForMemberOfWorkspace = (workspaceId, userId) =>
  Notification.deleteMany({ workspace: workspaceId, recipient: userId });

export const deleteForRecipient = (userId) => Notification.deleteMany({ recipient: userId });

export const deleteByTasks = (taskIds) => Notification.deleteMany({ 'meta.taskId': { $in: taskIds.map(String) } });
