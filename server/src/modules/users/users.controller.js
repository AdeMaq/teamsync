import asyncHandler from '../../core/utils/asyncHandler.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import * as usersService from './users.service.js';

export const getMe = asyncHandler(async (req, res) => {
  const user = await usersService.getUserProfile(req.user.id);
  sendSuccess(res, { user });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await usersService.updateProfile(req.user.id, req.body);
  sendSuccess(res, { user });
});

export const changeEmail = asyncHandler(async (req, res) => {
  const user = await usersService.changeEmail(req.user.id, req.body);
  sendSuccess(res, { user });
});

// The browser's refresh cookie is left in place: the refresh tokens are gone after this, so the next
// refresh fails with 401 and the auth controller clears the cookie.
export const changePassword = asyncHandler(async (req, res) => {
  await usersService.changePassword(req.user.id, req.body);
  sendSuccess(res, null);
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  const user = await usersService.setAvatar(req.user.id, req.file);
  sendSuccess(res, { user });
});

export const removeAvatar = asyncHandler(async (req, res) => {
  const user = await usersService.removeAvatar(req.user.id);
  sendSuccess(res, { user });
});

export const deleteAccount = asyncHandler(async (req, res) => {
  await usersService.deleteAccount(req.user.id, req.body);
  sendSuccess(res, null);
});
