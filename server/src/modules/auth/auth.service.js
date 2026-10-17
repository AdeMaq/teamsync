import crypto from 'crypto';
import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../../core/utils/password.js';
import { sendEmail } from '../../core/utils/sendEmail.js';
import {
  getTokenExpiry,
  hashToken,
  newTokenFamily,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../core/utils/generateToken.js';
import { env } from '../../config/env.js';
import logger from '../../config/logger.js';
import { usersService } from '../users/index.js';
import * as authRepository from './auth.repository.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // reset links work for 1 hour

const invalidCredentials = () =>
  new ApiError(HTTP.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS, 'Invalid email or password');

const invalidSession = (message = 'Session expired. Please log in again.') =>
  new ApiError(HTTP.UNAUTHORIZED, ERROR_CODES.INVALID_TOKEN, message);

// Creates an access token + a stored (hashed) refresh token for the user.
const issueSession = async (user, { ip, family = newTokenFamily() } = {}) => {
  const accessToken = signAccessToken(user.id);
  const refreshToken = signRefreshToken(user.id, family);
  const refreshExpiresAt = getTokenExpiry(refreshToken);

  await authRepository.createRefreshToken({
    user: user.id,
    tokenHash: hashToken(refreshToken),
    family,
    expiresAt: refreshExpiresAt,
    createdByIp: ip,
  });

  return { user, accessToken, refreshToken, refreshExpiresAt };
};

export const registerUser = async ({ name, email, password }, { ip } = {}) => {
  if (await usersService.findByEmail(email)) {
    throw new ApiError(HTTP.CONFLICT, ERROR_CODES.EMAIL_TAKEN, 'An account with this email already exists', [
      { field: 'email', message: 'An account with this email already exists' },
    ]);
  }

  const passwordHash = await hashPassword(password);
  const user = await usersService.createUser({ name, email, passwordHash });

  return issueSession(user, { ip });
};

export const authenticateUser = async ({ email, password }, { ip } = {}) => {
  const user = await usersService.findByEmailWithPassword(email);

  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !passwordOk) throw invalidCredentials();

  if (user.status === 'suspended') {
    throw new ApiError(HTTP.FORBIDDEN, ERROR_CODES.ACCOUNT_SUSPENDED, 'This account has been suspended');
  }

  await usersService.recordLogin(user.id);
  return issueSession(user, { ip });
};

// Rotation: every refresh revokes the presented token and issues a new one in the same family.
// A revoked token being presented again means it was stolen or replayed -> revoke the whole family.
export const rotateRefreshToken = async (rawToken, { ip } = {}) => {
  if (!rawToken) throw invalidSession('Not logged in');

  try {
    verifyRefreshToken(rawToken);
  } catch {
    throw invalidSession();
  }

  const stored = await authRepository.findRefreshTokenByHash(hashToken(rawToken));
  if (!stored) throw invalidSession();

  if (stored.revoked) {
    await authRepository.revokeTokenFamily(stored.family);
    throw invalidSession();
  }

  const user = await usersService.findById(stored.user);
  if (!user || user.status === 'suspended') {
    await authRepository.revokeTokenFamily(stored.family);
    throw invalidSession();
  }

  const session = await issueSession(user, { ip, family: stored.family });
  await authRepository.revokeRefreshToken(stored.id, hashToken(session.refreshToken));
  return session;
};

// Idempotent: logging out with a missing/unknown token is not an error.
export const revokeRefreshToken = async (rawToken) => {
  if (!rawToken) return;
  const stored = await authRepository.findRefreshTokenByHash(hashToken(rawToken));
  if (stored && !stored.revoked) {
    await authRepository.revokeRefreshToken(stored.id);
  }
};

// ---- Forgot / reset password ----

// Always resolves the same way whether or not the email has an account, so this endpoint cannot be
// used to find out who is registered. The email itself is sent without being awaited for the same reason
// (response time must not reveal whether the account exists).
export const requestPasswordReset = async (email) => {
  const user = await usersService.findByEmail(email);
  if (!user || user.status === 'suspended') return;

  const token = crypto.randomBytes(32).toString('hex');
  await usersService.setPasswordResetToken(user.id, hashToken(token), new Date(Date.now() + RESET_TOKEN_TTL_MS));

  const link = `${env.CLIENT_URL}/reset-password/${token}`;
  sendEmail({
    to: user.email,
    subject: 'Reset your TeamSync password',
    text:
      `Hi ${user.name},\n\n` +
      `We received a request to reset your TeamSync password. Open this link within 1 hour:\n${link}\n\n` +
      `If you did not ask for this, you can ignore this email and your password will stay the same.`,
    html:
      `<p>Hi ${user.name},</p>` +
      `<p>We received a request to reset your TeamSync password. This link works for 1 hour:</p>` +
      `<p><a href="${link}">Reset your password</a></p>` +
      `<p>If you did not ask for this, you can ignore this email and your password will stay the same.</p>`,
  }).catch((err) => logger.error(`Could not send password reset email: ${err.message}`));
};

// A reset link works once. Afterwards every session of the account is ended, because whoever
// had the old password (or a stolen session) must not stay signed in.
export const resetPassword = async ({ token, password }) => {
  const user = await usersService.findByValidResetToken(hashToken(token));
  if (!user) {
    throw new ApiError(HTTP.BAD_REQUEST, ERROR_CODES.INVALID_RESET_TOKEN, 'This reset link is invalid or has expired');
  }

  await usersService.updatePassword(user.id, await hashPassword(password));
  await authRepository.deleteRefreshTokensByUser(user.id);
};
