import mongoose from 'mongoose';
import Task from './tasks.model.js';

// Only these fields of a person are ever loaded for display.
const PERSON_FIELDS = 'name email avatar';

export const createTask = (data) => Task.create(data);

// Without populating: for permission checks.
export const findTaskById = (id) => Task.findById(id);

export const findTaskByIdWithPeople = (id) => Task.findById(id).populate('assignees', PERSON_FIELDS);

// A board needs every task of the project, so this is not paged (the service caps how many a project can hold).
export const listTasks = (projectId, filter) =>
  Task.find({ project: projectId, ...filter })
    .sort({ position: 1, _id: 1 })
    .populate('assignees', PERSON_FIELDS);

// Tasks per project and column for a whole workspace: [{ _id: { project, status }, count }]. One grouped query.
export const countTasksByWorkspace = (workspaceId) =>
  Task.aggregate([
    { $match: { workspace: new mongoose.Types.ObjectId(String(workspaceId)) } },
    { $group: { _id: { project: '$project', status: '$status' }, count: { $sum: 1 } } },
  ]);

// ---- Read models for the dashboard (every query is limited to one workspace) ----

const oid = (id) => new mongoose.Types.ObjectId(String(id));

// Per project: how many tasks, how many done, how many overdue (not done, with a due date before `todayStart`).
export const projectTaskTotals = (workspaceId, todayStart) =>
  Task.aggregate([
    { $match: { workspace: oid(workspaceId) } },
    {
      $group: {
        _id: '$project',
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
        overdue: {
          $sum: {
            $cond: [
              { $and: [{ $ne: ['$status', 'done'] }, { $eq: [{ $type: '$dueDate' }, 'date'] }, { $lt: ['$dueDate', todayStart] }] },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);

// Open tasks per assignee, busiest first.
export const openTasksPerAssignee = (workspaceId, limit) =>
  Task.aggregate([
    { $match: { workspace: oid(workspaceId), status: { $ne: 'done' }, 'assignees.0': { $exists: true } } },
    { $unwind: '$assignees' },
    { $group: { _id: '$assignees', count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
  ]);

// Tasks finished per calendar day (UTC) since `since`: [{ _id: '2026-11-14', count }].
export const completedPerDay = (workspaceId, since) =>
  Task.aggregate([
    { $match: { workspace: oid(workspaceId), status: 'done' } },
    { $addFields: { doneAt: { $ifNull: ['$completedAt', '$updatedAt'] } } },
    { $match: { doneAt: { $gte: since } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$doneAt', timezone: 'UTC' } }, count: { $sum: 1 } } },
  ]);

export const countOpenDueBetween = (workspaceId, from, to) =>
  Task.countDocuments({ workspace: workspaceId, status: { $ne: 'done' }, dueDate: { $gte: from, $lt: to } });

export const recentTasks = (workspaceId, limit) =>
  Task.find({ workspace: workspaceId }).sort({ createdAt: -1 }).limit(limit).select('title project createdBy createdAt').lean();

export const titlesOf = (workspaceId, taskIds) =>
  Task.find({ workspace: workspaceId, _id: { $in: taskIds } }).select('title project').lean();

export const countTasksByProject = (projectId) => Task.countDocuments({ project: projectId });

// The tasks of one column in display order, without the one being moved. Ids and positions only.
export const columnTasks = (projectId, status, excludeId) =>
  Task.find({ project: projectId, status, ...(excludeId && { _id: { $ne: excludeId } }) })
    .sort({ position: 1, _id: 1 })
    .select('_id position')
    .lean();

export const lastPositionInColumn = async (projectId, status) => {
  const last = await Task.findOne({ project: projectId, status }).sort({ position: -1 }).select('position').lean();
  return last ? last.position : null;
};

export const updateTaskById = (id, data) =>
  Task.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true });

// Gives the listed tasks the positions 1000, 2000... in the given order, and the moved task its new column.
export const renumberColumn = (orderedIds, step, movedId, status, completedAt) =>
  Task.bulkWrite(
    orderedIds.map((id, i) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { position: (i + 1) * step, ...(String(id) === String(movedId) && { status, completedAt }) } },
      },
    }))
  );

export const taskIdsByProject = async (projectId) =>
  (await Task.find({ project: projectId }).select('_id').lean()).map((t) => t._id);

export const deleteTaskById = (id) => Task.deleteOne({ _id: id });

// ---- Cleanup after other modules' events ----

export const deleteTasksByProject = (projectId) => Task.deleteMany({ project: projectId });

export const deleteTasksByWorkspace = (workspaceId) => Task.deleteMany({ workspace: workspaceId });

export const pullUserFromTasks = (userId) => Task.updateMany({ assignees: userId }, { $pull: { assignees: userId } });

export const pullUserFromWorkspaceTasks = (workspaceId, userId) =>
  Task.updateMany({ workspace: workspaceId, assignees: userId }, { $pull: { assignees: userId } });
