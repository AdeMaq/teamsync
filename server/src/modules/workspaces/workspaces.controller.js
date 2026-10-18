import asyncHandler from '../../core/utils/asyncHandler.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import * as workspacesService from './workspaces.service.js';

// req.workspace and req.membership are set by requireWorkspacePermission.

export const create = asyncHandler(async (req, res) => {
  const workspace = await workspacesService.createWorkspace(req.user.id, req.body);
  sendSuccess(res, { workspace }, HTTP.CREATED);
});

export const list = asyncHandler(async (req, res) => {
  const workspaces = await workspacesService.listUserWorkspaces(req.user.id);
  sendSuccess(res, { workspaces });
});

export const get = asyncHandler(async (req, res) => {
  const workspace = await workspacesService.getWorkspaceDetails(req.workspace.id, req.user.id);
  sendSuccess(res, { workspace });
});

export const update = asyncHandler(async (req, res) => {
  const workspace = await workspacesService.updateWorkspace(req.workspace.id, req.user.id, req.body);
  sendSuccess(res, { workspace });
});

export const remove = asyncHandler(async (req, res) => {
  await workspacesService.deleteWorkspace(req.workspace, req.body);
  sendSuccess(res, null);
});

export const invite = asyncHandler(async (req, res) => {
  const created = await workspacesService.inviteMember(req.workspace, req.membership, req.body);
  sendSuccess(res, { invite: created }, HTTP.CREATED);
});

export const listInvites = asyncHandler(async (req, res) => {
  const invites = await workspacesService.listInvites(req.workspace.id);
  sendSuccess(res, { invites });
});

export const revokeInvite = asyncHandler(async (req, res) => {
  await workspacesService.revokeInvite(req.workspace.id, req.params.inviteId);
  sendSuccess(res, null);
});

export const acceptInvite = asyncHandler(async (req, res) => {
  const workspace = await workspacesService.acceptInvite(req.user.id, req.body.token);
  sendSuccess(res, { workspace });
});

export const changeRole = asyncHandler(async (req, res) => {
  const workspace = await workspacesService.changeMemberRole(
    req.workspace,
    req.membership,
    req.params.memberId,
    req.body.role
  );
  sendSuccess(res, { workspace });
});

export const removeMember = asyncHandler(async (req, res) => {
  await workspacesService.removeMember(req.workspace, req.membership, req.params.memberId);
  sendSuccess(res, null);
});

export const transferOwnership = asyncHandler(async (req, res) => {
  const workspace = await workspacesService.transferOwnership(req.workspace, req.membership, req.body.userId);
  sendSuccess(res, { workspace });
});
