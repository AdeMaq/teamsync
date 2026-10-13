import Joi from 'joi';

// Field definitions shared by several modules' validation schemas.
export const emailField = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254).label('Email');
