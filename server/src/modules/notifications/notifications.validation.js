import Joi from 'joi';
import { objectIdField } from '../../core/validation/fields.js';

export const idParams = { params: Joi.object({ id: objectIdField.required() }) };

export const listNotificationsSchema = {
  query: Joi.object({
    unread: Joi.boolean().default(false).label('Unread'), // true = only unread ones
    page: Joi.number().integer().min(1).default(1).label('Page'),
    limit: Joi.number().integer().min(1).max(50).default(20).label('Limit'),
  }),
};
