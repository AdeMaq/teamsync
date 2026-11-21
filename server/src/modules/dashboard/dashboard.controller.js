import asyncHandler from '../../core/utils/asyncHandler.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import * as dashboardService from './dashboard.service.js';

// req.workspace is set by requireWorkspacePermission.
export const get = asyncHandler(async (req, res) => {
  sendSuccess(res, await dashboardService.getDashboard(req.workspace.id));
});
