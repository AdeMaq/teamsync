import mongoose from 'mongoose';
import { escapeRegex } from '../../core/utils/escapeRegex.js';
import Project from './projects.model.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

// Who the lead is, for display. Only these fields of a user are ever loaded.
const MEMBER_FIELDS = 'name email avatar';

const SORTS = {
  updated: { updatedAt: -1, _id: 1 },
  created: { createdAt: -1, _id: 1 },
  name: { name: 1, _id: 1 }, // _id as the tie-breaker keeps pages stable
};

export const createProject = (data) => Project.create(data);

// Without populating: for permission checks.
export const findProjectById = (id) => Project.findById(id);

export const findProjectByIdWithMembers = (id) => Project.findById(id).populate('members.user', MEMBER_FIELDS);

// Always limited to one workspace, so one team can never list another team's projects.
export const listProjects = async (workspaceId, { status, q, sort }, { skip, limit }) => {
  const filter = {
    workspace: workspaceId,
    ...(status && { status }),
    ...(q && { name: { $regex: escapeRegex(q), $options: 'i' } }),
  };

  const [projects, total] = await Promise.all([
    Project.find(filter).sort(SORTS[sort]).skip(skip).limit(limit).populate('members.user', MEMBER_FIELDS),
    Project.countDocuments(filter),
  ]);

  return { projects, total };
};

export const updateProjectById = (id, data) =>
  Project.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true });

// Makes `userId` the one and only lead. One atomic update, so a project never ends up with two leads or none
// halfway through. (A pipeline update does not touch updatedAt by itself.)
export const setLead = (id, userId) =>
  Project.updateOne(
    { _id: id },
    [
      {
        $set: {
          updatedAt: '$$NOW',
          members: {
            $concatArrays: [
              {
                $filter: {
                  input: '$members',
                  cond: { $and: [{ $ne: ['$$this.role', 'lead'] }, { $ne: ['$$this.user', oid(userId)] }] },
                },
              },
              [{ user: oid(userId), role: 'lead' }],
            ],
          },
        },
      },
    ],
    { updatePipeline: true }
  );

export const deleteProjectById = (id) => Project.deleteOne({ _id: id });

// ---- Cleanup after other modules' events ----

export const deleteProjectsByWorkspace = (workspaceId) => Project.deleteMany({ workspace: workspaceId });

export const pullUserFromProjects = (userId) =>
  Project.updateMany({ 'members.user': userId }, { $pull: { members: { user: userId } } });

export const pullUserFromWorkspaceProjects = (workspaceId, userId) =>
  Project.updateMany({ workspace: workspaceId, 'members.user': userId }, { $pull: { members: { user: userId } } });
