import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import { can } from '../../core/constants/permissions.js';
import { findProject, isLead } from '../projects/index.js';
import { getMembership } from '../workspaces/index.js';
import * as tasksRepository from './tasks.repository.js';

// Positions are spaced 1000 apart so a task can be dropped between two others without touching the rest
// (it takes the average of its neighbours). If repeated drops squeeze two neighbours closer than MIN_GAP, the
// whole column is renumbered.
const STEP = 1000;
const MIN_GAP = 1e-6;

export const MAX_TASKS_PER_PROJECT = 500;

// ---- helpers ----

const idOf = (value) => String(value?._id ?? value); // works for ids and for populated documents

const fieldError = (statusCode, code, field, message) =>
  new ApiError(statusCode, code, message, [{ field, message }]);

const taskNotFound = () => new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'Task not found');

// Workspace admins and the owner, the project's lead, and whoever created the task can delete it.
export const canDeleteTask = (workspaceRole, project, task, userId) =>
  can(workspaceRole, 'task:delete') || isLead(project, userId) || idOf(task.createdBy) === idOf(userId);

// Needs the task loaded with its assignees populated (see findTaskByIdWithPeople).
const toTask = (task, { project, role, userId }) => ({
  _id: task.id,
  title: task.title,
  description: task.description,
  workspace: idOf(task.workspace),
  project: idOf(task.project),
  status: task.status,
  priority: task.priority,
  assignee: task.assignees[0] ?? null, // one person per task for now (the model stores a list)
  dueDate: task.dueDate ?? null,
  position: task.position,
  createdBy: idOf(task.createdBy),
  canDelete: canDeleteTask(role, project, task, userId), // lets the screen hide the button; the server checks again
  createdAt: task.createdAt,
  updatedAt: task.updatedAt,
});

// The assignee must belong to the project's workspace.
const assertAssignable = async (workspaceId, assigneeId) => {
  if (assigneeId && !(await getMembership(workspaceId, assigneeId))) {
    throw fieldError(HTTP.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, 'assigneeId', 'The assignee must be a member of this workspace');
  }
};

const withAssignees = (assigneeId) => (assigneeId ? [assigneeId] : []);

// ---- API used by the access middleware ----

export const findTask = (id) => tasksRepository.findTaskById(id);

export const loadProjectOf = (task) => findProject(task.project);

// ---- Tasks ----

export const createTask = async (project, ctx, { assigneeId, ...data }) => {
  await assertAssignable(project.workspace, assigneeId);

  if ((await tasksRepository.countTasksByProject(project.id)) >= MAX_TASKS_PER_PROJECT) {
    throw new ApiError(
      HTTP.CONFLICT,
      ERROR_CODES.CONFLICT,
      `A project can hold up to ${MAX_TASKS_PER_PROJECT} tasks. Delete finished ones first.`
    );
  }

  const last = await tasksRepository.lastPositionInColumn(project.id, data.status);
  const created = await tasksRepository.createTask({
    ...data,
    workspace: project.workspace,
    project: project.id,
    createdBy: ctx.userId,
    assignees: withAssignees(assigneeId),
    position: last === null ? STEP : last + STEP, // the bottom of its column
  });

  return toTask(await tasksRepository.findTaskByIdWithPeople(created.id), ctx);
};

export const listTasks = async (project, ctx, { status, priority, assignee }) => {
  const filter = {
    ...(status && { status }),
    ...(priority && { priority }),
    ...(assignee === 'me' && { assignees: ctx.userId }),
    ...(assignee === 'none' && { assignees: { $size: 0 } }),
    ...(assignee && assignee !== 'me' && assignee !== 'none' && { assignees: assignee }),
  };

  const tasks = await tasksRepository.listTasks(project.id, filter);
  return { tasks: tasks.map((task) => toTask(task, ctx)) };
};

// { [projectId]: { todo, 'in-progress', 'in-review', 'done', total } } for every project that has tasks;
// projects without tasks are left out (the screen treats a missing entry as zeros).
export const taskCountsForWorkspace = async (workspaceId) => {
  const rows = await tasksRepository.countTasksByWorkspace(workspaceId);
  const counts = {};
  for (const { _id, count } of rows) {
    const entry = (counts[_id.project] ??= { todo: 0, 'in-progress': 0, 'in-review': 0, done: 0, total: 0 });
    entry[_id.status] = count;
    entry.total += count;
  }
  return counts;
};

export const getTask = async (taskId, ctx) => {
  const task = await tasksRepository.findTaskByIdWithPeople(taskId);
  if (!task) throw taskNotFound();
  return toTask(task, ctx);
};

export const updateTask = async (task, ctx, { assigneeId, ...fields }) => {
  await assertAssignable(task.workspace, assigneeId);

  const changes = { ...fields, ...(assigneeId !== undefined && { assignees: withAssignees(assigneeId) }) };
  const updated = await tasksRepository.updateTaskById(task.id, changes);
  if (!updated) throw taskNotFound(); // deleted while editing

  return getTask(task.id, ctx);
};

// Puts the task in column `status` at place `index` (0 = top; left out = bottom).
export const moveTask = async (task, ctx, { status, index }) => {
  const column = await tasksRepository.columnTasks(task.project, status, task.id);
  const at = index === undefined ? column.length : Math.min(index, column.length);
  const above = column[at - 1]?.position;
  const below = column[at]?.position;

  if (above !== undefined && below !== undefined && below - above < MIN_GAP * 2) {
    const ordered = column.map((t) => t._id);
    ordered.splice(at, 0, task._id);
    await tasksRepository.renumberColumn(ordered, STEP, task._id, status);
  } else {
    let position = STEP; // an empty column
    if (above === undefined && below !== undefined) position = below - STEP;
    else if (above !== undefined && below === undefined) position = above + STEP;
    else if (above !== undefined && below !== undefined) position = (above + below) / 2;

    const updated = await tasksRepository.updateTaskById(task.id, { status, position });
    if (!updated) throw taskNotFound();
  }

  return getTask(task.id, ctx);
};

export const deleteTask = (task) => tasksRepository.deleteTaskById(task.id);

// ---- Clean-up after events from other modules (called by tasks.events.js) ----

export const handleProjectDeleted = (projectId) => tasksRepository.deleteTasksByProject(projectId);

// Deleting a workspace removes its projects without a PROJECT_DELETED event each, so its tasks go with it here.
export const handleWorkspaceDeleted = (workspaceId) => tasksRepository.deleteTasksByWorkspace(workspaceId);

// A deleted account, or someone who left a workspace, stops being assigned to tasks; the tasks stay.
export const handleUserDeleted = (userId) => tasksRepository.pullUserFromTasks(userId);

export const handleMemberRemoved = (workspaceId, userId) =>
  tasksRepository.pullUserFromWorkspaceTasks(workspaceId, userId);
