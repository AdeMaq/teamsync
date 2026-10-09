import mongoose from 'mongoose';

// Only a HASH of the token is stored. `family` groups tokens issued from one login so
// that reuse of a revoked token can revoke the whole family (reuse detection).
// Indexes (unique tokenHash, TTL on expiresAt) are defined in database/migrations.
const refreshTokenSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true },
    family: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdByIp: { type: String },
    revoked: { type: Boolean, default: false },
    revokedAt: { type: Date },
    replacedByTokenHash: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('RefreshToken', refreshTokenSchema);
