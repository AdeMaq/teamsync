import mongoose from 'mongoose';

// Comments live in their own collection (modules/comments) because they grow without bound.
// Indexes (project + status + position, assignees) are defined in database/migrations.
const taskSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: '' },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignees: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: {
      type: String,
      enum: ['todo', 'in-progress', 'in-review', 'done'],
      default: 'todo',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    labels: [{ type: String, trim: true }],
    dueDate: { type: Date },
    position: { type: Number, default: 0 }, // ordering within a Kanban column
    // Bounded list -> embedded. Enforce a cap in the service (e.g. 20 per task).
    attachments: [
      {
        url: { type: String, required: true },
        filename: { type: String, required: true },
        mimeType: { type: String },
        size: { type: Number },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Task', taskSchema);
