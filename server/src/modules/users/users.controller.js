import asyncHandler from '../../core/utils/asyncHandler.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import * as usersService from './users.service.js';

export const getMe = asyncHandler(async (req, res) => {
  const user = await usersService.getUserProfile(req.user.id);
  sendSuccess(res, { user });
});
