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
export const renumberColumn = (orderedIds, step, movedId, status) =>
  Task.bulkWrite(
    orderedIds.map((id, i) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { position: (i + 1) * step, ...(String(id) === String(movedId) && { status }) } },
      },
    }))
  );

export const deleteTaskById = (id) => Task.deleteOne({ _id: id });

// ---- Cleanup after other modules' events ----

export const deleteTasksByProject = (projectId) => Task.deleteMany({ project: projectId });

export const deleteTasksByWorkspace = (workspaceId) => Task.deleteMany({ workspace: workspaceId });

export const pullUserFromTasks = (userId) => Task.updateMany({ assignees: userId }, { $pull: { assignees: userId } });

export const pullUserFromWorkspaceTasks = (workspaceId, userId) =>
  Task.updateMany({ workspace: workspaceId, assignees: userId }, { $pull: { assignees: userId } });
