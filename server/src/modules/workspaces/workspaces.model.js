import mongoose from 'mongoose';

// Indexes (unique slug, members.user) are defined in database/migrations.
const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: '', maxlength: 500 },
    logo: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Small, bounded list -> embedded.
    members: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    // Pending invites by email, until the invited user accepts.
    invites: [
      {
        _id: false,
        email: { type: String, lowercase: true, trim: true, required: true },
        role: { type: String, enum: ['admin', 'member'], default: 'member' },
        tokenHash: { type: String, required: true },
        invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        expiresAt: { type: Date, required: true },
      },
    ],
    plan: { type: String, enum: ['free', 'pro', 'enterprise'], default: 'free' },
  },
  { timestamps: true }
);

export default mongoose.model('Workspace', workspaceSchema);
