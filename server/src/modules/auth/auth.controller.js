import asyncHandler from '../../core/utils/asyncHandler.js';
import { sendSuccess } from '../../core/utils/apiResponse.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import { env } from '../../config/env.js';
import * as authService from './auth.service.js';

const REFRESH_COOKIE = 'refreshToken';

// httpOnly keeps the token away from JavaScript; path limits it to auth routes only.
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/api/v1/auth',
};

const setRefreshCookie = (res, token, expires) => res.cookie(REFRESH_COOKIE, token, { ...cookieOptions, expires });

// Response body for any call that starts a session. The refresh token only ever travels in the cookie.
const sendSession = (res, session, statusCode = HTTP.OK) => {
  setRefreshCookie(res, session.refreshToken, session.refreshExpiresAt);
  sendSuccess(res, { user: session.user, accessToken: session.accessToken }, statusCode);
};

export const register = asyncHandler(async (req, res) => {
  const session = await authService.registerUser(req.body, { ip: req.ip });
  sendSession(res, session, HTTP.CREATED);
});

export const login = asyncHandler(async (req, res) => {
  const session = await authService.authenticateUser(req.body, { ip: req.ip });
  sendSession(res, session);
});

export const refreshToken = asyncHandler(async (req, res) => {
  try {
    const session = await authService.rotateRefreshToken(req.cookies?.[REFRESH_COOKIE], { ip: req.ip });
    sendSession(res, session);
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    throw err;
  }
});

export const logout = asyncHandler(async (req, res) => {
  await authService.revokeRefreshToken(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, cookieOptions);
  sendSuccess(res, null);
});
