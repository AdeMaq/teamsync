import mongoose from 'mongoose';

// Indexes (e.g. unique email) are defined in database/migrations, not here.
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email format'],
    },
    // bcrypt hash. Hashing happens in the services (core/utils/password.js), not in the model.
    passwordHash: { type: String, required: true, select: false },
    avatar: { type: String, default: '' },
    isEmailVerified: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['active', 'invited', 'suspended'],
      default: 'active',
    },
    lastLoginAt: { type: Date },
    // Forgot-password flow: only a SHA-256 hash of the emailed token is stored, and it expires.
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.passwordResetTokenHash;
        delete ret.passwordResetExpiresAt;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export default mongoose.model('User', userSchema);
