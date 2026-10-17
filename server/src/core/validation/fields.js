import Joi from 'joi';

// Field definitions shared by several modules' validation schemas.
export const emailField = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254).label('Email');

export const nameField = Joi.string().trim().min(2).max(100).label('Name');

// bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated.
export const passwordField = Joi.string().min(8).max(72).label('Password');
