import mongoose from 'mongoose';
import Workspace from './workspaces.model.js';

const oid = (id) => new mongoose.Types.ObjectId(String(id));

// ---- Workspaces ----

export const createWorkspace = (data) => Workspace.create(data);

export const findWorkspaceById = (id) => Workspace.findById(id);

export const findWorkspaceByIdWithMembers = (id) => Workspace.findById(id).populate('members.user', 'name email avatar');

export const slugExists = (slug) => Workspace.exists({ slug });

export const findWorkspacesByMember = (userId) => Workspace.find({ 'members.user': userId }).sort({ name: 1 });

export const findWorkspacesOwnedBy = (userId) => Workspace.find({ owner: userId });

export const updateWorkspaceById = (id, data) =>
  Workspace.findByIdAndUpdate(id, { $set: data }, { returnDocument: 'after', runValidators: true });

export const deleteWorkspaceById = (id) => Workspace.deleteOne({ _id: id });

// ---- Invitations ----

export const removeExpiredInvites = (id) =>
  Workspace.updateOne({ _id: id }, { $pull: { invites: { expiresAt: { $lte: new Date() } } } });

export const removeInvitesForEmail = (id, email) => Workspace.updateOne({ _id: id }, { $pull: { invites: { email } } });

// Returns the invitation that was just added (the last one in the list).
export const addInvite = async (id, invite) => {
  const updated = await Workspace.findByIdAndUpdate(id, { $push: { invites: invite } }, { returnDocument: 'after' });
  return updated.invites.at(-1);
};

export const removeInviteById = (id, inviteId) => Workspace.updateOne({ _id: id }, { $pull: { invites: { _id: inviteId } } });

export const findWorkspaceByInviteHash = (tokenHash) => Workspace.findOne({ 'invites.tokenHash': tokenHash });

// Atomic: only changes anything if the invitation still exists, the user is not a member yet and (when the plan
// has a member limit) there is still room, so simultaneous clicks cannot add the same person twice or overfill it.
export const acceptInvite = (id, inviteId, userId, role, memberLimit = null) =>
  Workspace.updateOne(
    {
      _id: id,
      'invites._id': inviteId,
      'members.user': { $ne: userId },
      ...(memberLimit !== null && { $expr: { $lt: [{ $size: '$members' }, memberLimit] } }),
    },
    { $push: { members: { user: userId, role, joinedAt: new Date() } }, $pull: { invites: { _id: inviteId } } }
  );

// ---- Members ----

export const setMemberRole = (id, userId, role) =>
  Workspace.updateOne({ _id: id, 'members.user': userId }, { $set: { 'members.$.role': role } });

export const removeMember = (id, userId) => Workspace.updateOne({ _id: id }, { $pull: { members: { user: userId } } });

// New owner becomes "owner", the previous owner becomes "admin".
export const transferOwnership = (id, fromUserId, toUserId) =>
  Workspace.updateOne(
    { _id: id },
    { $set: { owner: toUserId, 'members.$[next].role': 'owner', 'members.$[previous].role': 'admin' } },
    { arrayFilters: [{ 'next.user': oid(toUserId) }, { 'previous.user': oid(fromUserId) }] }
  );

// Used when the owner's account is deleted: the successor becomes owner (the old owner is removed afterwards).
export const promoteToOwner = (id, userId) =>
  Workspace.updateOne(
    { _id: id },
    { $set: { owner: userId, 'members.$[next].role': 'owner' } },
    { arrayFilters: [{ 'next.user': oid(userId) }] }
  );

// ---- Account deletion cleanup ----

export const pullUserFromAllWorkspaces = (userId) =>
  Workspace.updateMany({ 'members.user': userId }, { $pull: { members: { user: userId } } });

export const pullInvitesSentBy = (userId) =>
  Workspace.updateMany({ 'invites.invitedBy': userId }, { $pull: { invites: { invitedBy: userId } } });
