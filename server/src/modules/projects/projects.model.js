import mongoose from 'mongoose';

// Indexes (workspace + status) are defined in database/migrations.
const projectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, default: '', maxlength: 1000 },
    workspace: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['lead', 'contributor', 'viewer'], default: 'contributor' },
      },
    ],
    status: {
      type: String,
      enum: ['planning', 'active', 'on-hold', 'completed', 'archived'],
      default: 'planning',
    },
    color: { type: String, default: '#2DD4BF' },
    startDate: { type: Date },
    endDate: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Project', projectSchema);
