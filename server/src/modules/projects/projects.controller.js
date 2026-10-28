import asyncHandler from '../../core/utils/asyncHandler.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import * as projectsService from './projects.service.js';

// Workspace-scoped routes (req.membership comes from requireWorkspacePermission) ...

export const create = asyncHandler(async (req, res) => {
  const project = await projectsService.createProject(req.params.workspaceId, req.user.id, req.membership.role, req.body);
  sendSuccess(res, { project }, HTTP.CREATED);
});

export const list = asyncHandler(async (req, res) => {
  const result = await projectsService.listProjects(
    req.params.workspaceId,
    req.user.id,
    req.membership.role,
    req.valid.query // validated and defaulted by validate(); req.query itself stays untouched
  );
  sendSuccess(res, result);
});

// ... and project routes (req.project and req.membership come from requireProjectPermission).

export const get = asyncHandler(async (req, res) => {
  const project = await projectsService.getProject(req.project.id, req.user.id, req.membership.role);
  sendSuccess(res, { project });
});

export const update = asyncHandler(async (req, res) => {
  const project = await projectsService.updateProject(req.project, req.user.id, req.membership.role, req.body);
  sendSuccess(res, { project });
});

export const remove = asyncHandler(async (req, res) => {
  await projectsService.deleteProject(req.project);
  sendSuccess(res, null);
});
