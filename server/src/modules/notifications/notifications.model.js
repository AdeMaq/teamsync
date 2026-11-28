import mongoose from 'mongoose';

// Indexes (recipient + isRead + createdAt desc) are defined in database/migrations.
const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // The workspace it happened in, so leaving or deleting a workspace removes its notifications.
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    type: {
      type: String,
      enum: ['task_assigned', 'task_updated', 'mention', 'workspace_invite', 'message', 'comment'],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
