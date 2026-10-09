import mongoose from 'mongoose';

// Indexes (task + createdAt) are defined in database/migrations.
const commentSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, maxlength: 5000 },
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    editedAt: { type: Date },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Comment', commentSchema);
