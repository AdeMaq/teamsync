import asyncHandler from '../../core/utils/asyncHandler.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import * as notificationsService from './notifications.service.js';

// Every route works on the logged-in person's own notifications.

export const list = asyncHandler(async (req, res) => {
  sendSuccess(res, await notificationsService.listNotifications(req.user.id, req.valid.query));
});

export const unreadCount = asyncHandler(async (req, res) => {
  sendSuccess(res, { count: await notificationsService.unreadCount(req.user.id) });
});

export const markRead = asyncHandler(async (req, res) => {
  sendSuccess(res, { notification: await notificationsService.markRead(req.user.id, req.params.id) });
});

export const markAllRead = asyncHandler(async (req, res) => {
  sendSuccess(res, { updated: await notificationsService.markAllRead(req.user.id) });
});

export const remove = asyncHandler(async (req, res) => {
  await notificationsService.deleteNotification(req.user.id, req.params.id);
  sendSuccess(res, null);
});
