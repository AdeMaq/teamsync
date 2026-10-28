import Joi from 'joi';
import { nameField, objectIdField } from '../../core/validation/fields.js';

export const PROJECT_STATUSES = ['planning', 'active', 'on-hold', 'completed', 'archived'];

const workspaceParams = Joi.object({ workspaceId: objectIdField.required() });
const projectParams = Joi.object({ id: objectIdField.required() });

const description = Joi.string().trim().allow('').max(1000).label('Description');
const status = Joi.string().valid(...PROJECT_STATUSES).label('Status');
const color = Joi.string()
  .pattern(/^#[0-9a-fA-F]{6}$/)
  .messages({ 'string.pattern.base': 'Color must look like #2DD4BF' })
  .label('Color');
// null clears a date. That the end is not before the start is checked in the service, because on an update
// it depends on the dates already stored.
const date = (label) => Joi.date().iso().allow(null).label(label);

export const idParams = { params: projectParams };

export const createProjectSchema = {
  params: workspaceParams,
  body: Joi.object({
    name: nameField.required(),
    description: description.default(''),
    status: status.default('planning'),
    color,
    startDate: date('Start date'),
    endDate: date('End date'),
  }),
};

export const updateProjectSchema = {
  params: projectParams,
  body: Joi.object({
    name: nameField,
    description,
    status,
    color,
    startDate: date('Start date'),
    endDate: date('End date'),
    // Hands the project over to another workspace member.
    leadId: objectIdField.label('Lead'),
  }).min(1),
};

export const listProjectsSchema = {
  params: workspaceParams,
  query: Joi.object({
    status,
    q: Joi.string().trim().allow('').max(100).label('Search'),
    sort: Joi.string().valid('updated', 'name', 'created').default('updated').label('Sort'),
    page: Joi.number().integer().min(1).default(1).label('Page'),
    limit: Joi.number().integer().min(1).max(100).default(20).label('Limit'),
  }),
};
