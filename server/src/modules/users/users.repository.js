import User from './users.model.js';

export const createUser = (data) => User.create(data);

export const findUserById = (id) => User.findById(id);

export const findUserByEmail = (email) => User.findOne({ email });

// passwordHash is `select: false` on the schema, so it must be requested explicitly.
export const findUserByEmailWithPassword = (email) => User.findOne({ email }).select('+passwordHash');

export const updateLastLogin = (id) => User.updateOne({ _id: id }, { $set: { lastLoginAt: new Date() } });
