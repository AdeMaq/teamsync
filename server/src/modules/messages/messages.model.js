import mongoose from 'mongoose';

// Indexes (workspace + channel + createdAt desc) are defined in database/migrations.
const messageSchema = new mongoose.Schema(
  {
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    channel: { type: String, required: true, default: 'general', trim: true, lowercase: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true, trim: true, maxlength: 5000 },
    attachments: [
      {
        _id: false,
        url: { type: String, required: true },
        filename: { type: String },
        mimeType: { type: String },
      },
    ],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    editedAt: { type: Date },
    deletedAt: { type: Date }, // soft delete
  },
  { timestamps: true }
);

export default mongoose.model('Message', messageSchema);
