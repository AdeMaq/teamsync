import Joi from 'joi';

const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254).label('Email');

// bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated.
const password = Joi.string().min(8).max(72).label('Password');

export const registerSchema = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required().label('Name'),
    email: email.required(),
    password: password.required(),
  }),
};

export const loginSchema = {
  body: Joi.object({
    email: email.required(),
    // No length rules at login: any wrong password must produce the same generic error.
    password: Joi.string().required().label('Password'),
  }),
};
