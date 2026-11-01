import asyncHandler from '../../core/utils/asyncHandler.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import * as tasksService from './tasks.service.js';

// What the service needs to know about the caller. req.project and req.membership come from the access middleware.
const contextOf = (req) => ({ project: req.project, role: req.membership.role, userId: req.user.id });

// Project-scoped routes (/projects/:id/tasks) ...

export const create = asyncHandler(async (req, res) => {
  const task = await tasksService.createTask(req.project, contextOf(req), req.body);
  sendSuccess(res, { task }, HTTP.CREATED);
});

export const list = asyncHandler(async (req, res) => {
  const result = await tasksService.listTasks(req.project, contextOf(req), req.valid.query);
  sendSuccess(res, result);
});

// ... and task routes (/tasks/:id), where req.task is also set.

export const get = asyncHandler(async (req, res) => {
  const task = await tasksService.getTask(req.task.id, contextOf(req));
  sendSuccess(res, { task });
});

export const update = asyncHandler(async (req, res) => {
  const task = await tasksService.updateTask(req.task, contextOf(req), req.body);
  sendSuccess(res, { task });
});

export const move = asyncHandler(async (req, res) => {
  const task = await tasksService.moveTask(req.task, contextOf(req), req.body);
  sendSuccess(res, { task });
});

export const remove = asyncHandler(async (req, res) => {
  await tasksService.deleteTask(req.task);
  sendSuccess(res, null);
});
