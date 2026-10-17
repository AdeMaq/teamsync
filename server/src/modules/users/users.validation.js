import Joi from 'joi';
import { emailField, nameField, passwordField } from '../../core/validation/fields.js';

// The current password is required for sensitive changes, so a stolen access token alone is not enough.
const currentPassword = Joi.string().required().label('Password');

export const updateProfileSchema = {
  body: Joi.object({
    name: nameField.required(),
  }),
};

export const changeEmailSchema = {
  body: Joi.object({
    email: emailField.required(),
    password: currentPassword,
  }),
};

export const changePasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().required().label('Current password'),
    newPassword: passwordField.label('New password').required(),
  }),
};

export const deleteAccountSchema = {
  body: Joi.object({
    password: currentPassword,
  }),
};
