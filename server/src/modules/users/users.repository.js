import User from './users.model.js';

export const createUser = (data) => User.create(data);

export const findUserById = (id) => User.findById(id);

// passwordHash is `select: false` on the schema, so it must be requested explicitly.
export const findUserByIdWithPassword = (id) => User.findById(id).select('+passwordHash');

export const findUserByEmail = (email) => User.findOne({ email });

export const findUserByEmailWithPassword = (email) => User.findOne({ email }).select('+passwordHash');

export const updateLastLogin = (id) => User.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } });

// Returns the updated document.
export const updateUserById = (id, data) =>
  User.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true });

export const deleteUserById = (id) => User.deleteOne({ _id: id });

// ---- Password reset ----

export const setPasswordResetToken = (id, tokenHash, expiresAt) =>
  User.updateOne({ _id: id }, { $set: { passwordResetTokenHash: tokenHash, passwordResetExpiresAt: expiresAt } });

// Only matches a token that has not expired yet.
export const findUserByValidResetToken = (tokenHash) =>
  User.findOne({ passwordResetTokenHash: tokenHash, passwordResetExpiresAt: { $gt: new Date() } });

// Sets the new password and removes the reset token in one write, so a link works only once.
export const updatePasswordAndClearReset = (id, passwordHash) =>
  User.updateOne(
    { _id: id },
    { $set: { passwordHash }, $unset: { passwordResetTokenHash: 1, passwordResetExpiresAt: 1 } }
  );
