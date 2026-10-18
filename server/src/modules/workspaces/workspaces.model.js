import mongoose from 'mongoose';

// Indexes (unique slug, members.user, invites.tokenHash) are defined in database/migrations.
const workspaceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    // Used in URLs. Set at creation and never changed afterwards, so links keep working.
    slug: { type: String, required: true, lowercase: true, trim: true },
    description: { type: String, default: '', maxlength: 500 },
    logo: { type: String, default: '' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Small, bounded list -> embedded. The owner is always also listed here with role "owner".
    members: [
      {
        _id: false,
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
        joinedAt: { type: Date, default: Date.now },
      },
    ],
    // Pending invitations by email, until accepted, revoked or expired. Only a hash of the emailed
    // token is stored. Capped in the service. These keep their own _id so one can be revoked.
    invites: [
      {
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
