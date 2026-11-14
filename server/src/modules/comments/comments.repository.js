import Comment from './comments.model.js';

// Only these fields of a person are ever loaded for display.
const PERSON_FIELDS = 'name email avatar';

export const createComment = (data) => Comment.create(data);

// Without populating: for permission checks.
export const findCommentById = (id) => Comment.findById(id);

export const findCommentByIdWithAuthor = (id) => Comment.findById(id).populate('author', PERSON_FIELDS);

// Oldest first, like a conversation. _id is the tie-breaker so pages stay stable.
export const listComments = async (taskId, { skip, limit }) => {
  const [comments, total] = await Promise.all([
    Comment.find({ task: taskId }).sort({ createdAt: 1, _id: 1 }).skip(skip).limit(limit).populate('author', PERSON_FIELDS),
    Comment.countDocuments({ task: taskId }),
  ]);
  return { comments, total };
};

export const updateCommentText = (id, text) =>
  Comment.findByIdAndUpdate(id, { $set: { text, editedAt: new Date() } }, { returnDocument: 'after', runValidators: true });

export const deleteCommentById = (id) => Comment.deleteOne({ _id: id });

// ---- Cleanup after other modules' events ----

export const deleteCommentsByTasks = (taskIds) => Comment.deleteMany({ task: { $in: taskIds } });

export const deleteCommentsByWorkspace = (workspaceId) => Comment.deleteMany({ workspace: workspaceId });
