import Joi from 'joi';
import { objectIdField } from '../../core/validation/fields.js';

export const TASK_STATUSES = ['todo', 'in-progress', 'in-review', 'done'];
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// `id` is the project for /projects/:id/tasks and the task for /tasks/:id.
const idParam = Joi.object({ id: objectIdField.required() });

const title = Joi.string().trim().min(1).max(200).label('Title');
const description = Joi.string().trim().allow('').max(5000).label('Description');
const status = Joi.string().valid(...TASK_STATUSES).label('Status');
const priority = Joi.string().valid(...TASK_PRIORITIES).label('Priority');
// null clears these two.
const dueDate = Joi.date().iso().allow(null).label('Due date');
const assigneeId = objectIdField.allow(null).label('Assignee');

export const idParams = { params: idParam };

export const createTaskSchema = {
  params: idParam,
  body: Joi.object({
    title: title.required(),
    description: description.default(''),
    status: status.default('todo'),
    priority: priority.default('medium'),
    assigneeId,
    dueDate,
  }),
};

// Moving between columns (status) and ordering go through the move endpoint, not through here.
export const updateTaskSchema = {
  params: idParam,
  body: Joi.object({ title, description, priority, assigneeId, dueDate }).min(1),
};

// `index` is the place in the destination column (0 = top), counted without the task itself. Left out = the bottom.
export const moveTaskSchema = {
  params: idParam,
  body: Joi.object({
    status: status.required(),
    index: Joi.number().integer().min(0).label('Index'),
  }),
};

export const listTasksSchema = {
  params: idParam,
  query: Joi.object({
    status,
    priority,
    // "me", "none" (unassigned), or a person's id
    assignee: Joi.alternatives(Joi.string().valid('me', 'none'), objectIdField).label('Assignee'),
  }),
};

export const workspaceCountsSchema = { params: Joi.object({ workspaceId: objectIdField.required() }) };
