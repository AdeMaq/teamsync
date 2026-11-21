import Joi from 'joi';
import { objectIdField } from '../../core/validation/fields.js';

export const dashboardSchema = { params: Joi.object({ workspaceId: objectIdField.required() }) };
