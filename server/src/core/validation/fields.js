import Joi from 'joi';

// Field definitions shared by several modules' validation schemas.
export const emailField = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254).label('Email');

// A MongoDB ObjectId in its text form. Checking it up front turns a bad id into a clean 400 instead of a cast error.
export const objectIdField = Joi.string().hex().length(24).label('Id');

export const nameField = Joi.string().trim().min(2).max(100).label('Name');

// bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated.
export const passwordField = Joi.string().min(8).max(72).label('Password');
