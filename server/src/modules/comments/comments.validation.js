import Joi from 'joi';
import { objectIdField } from '../../core/validation/fields.js';

const idParam = Joi.object({ id: objectIdField.required() }); // the task for /tasks/:id/comments, the comment for /comments/:id
const text = Joi.string().trim().min(1).max(5000).required().label('Comment');
// People @mentioned in the comment (the screen picks them from the workspace's members).
export const MAX_MENTIONS = 20;
const mentions = Joi.array().items(objectIdField).unique().max(MAX_MENTIONS).label('Mentions');

export const idParams = { params: idParam };

export const createCommentSchema = { params: idParam, body: Joi.object({ text, mentions: mentions.default([]) }) };

// Leaving `mentions` out keeps the comment's mentions as they are.
export const updateCommentSchema = { params: idParam, body: Joi.object({ text, mentions }) };

export const listCommentsSchema = {
  params: idParam,
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1).label('Page'),
    limit: Joi.number().integer().min(1).max(100).default(50).label('Limit'),
  }),
};
