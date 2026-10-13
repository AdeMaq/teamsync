import Joi from 'joi';
import { emailField } from '../../core/validation/fields.js';

// The current password is required for sensitive changes, so a stolen access token alone is not enough.
const currentPassword = Joi.string().required().label('Password');

export const changeEmailSchema = {
  body: Joi.object({
    email: emailField.required(),
    password: currentPassword,
  }),
};

export const deleteAccountSchema = {
  body: Joi.object({
    password: currentPassword,
  }),
};
