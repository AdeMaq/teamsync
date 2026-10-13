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
  User.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });

export const deleteUserById = (id) => User.deleteOne({ _id: id });
