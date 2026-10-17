import Joi from 'joi';
import { emailField, nameField, passwordField } from '../../core/validation/fields.js';

export const registerSchema = {
  body: Joi.object({
    name: nameField.required(),
    email: emailField.required(),
    password: passwordField.required(),
  }),
};

export const loginSchema = {
  body: Joi.object({
    email: emailField.required(),
    // No length rules at login: any wrong password must produce the same generic error.
    password: Joi.string().required().label('Password'),
  }),
};

export const forgotPasswordSchema = {
  body: Joi.object({
    email: emailField.required(),
  }),
};

export const resetPasswordSchema = {
  body: Joi.object({
    // 32 random bytes, hex encoded (see requestPasswordReset in auth.service.js)
    token: Joi.string().hex().length(64).required().label('Reset token'),
    password: passwordField.required(),
  }),
};
