import bcrypt from 'bcryptjs';
import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import {
  getTokenExpiry,
  hashToken,
  newTokenFamily,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../../core/utils/generateToken.js';
import { usersService } from '../users/index.js';
import * as authRepository from './auth.repository.js';

const BCRYPT_ROUNDS = 12;

// Compared against when the email is unknown, so a missing account and a wrong password
// take the same time and cannot be told apart.
const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', BCRYPT_ROUNDS);

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

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await usersService.createUser({ name, email, passwordHash });

  return issueSession(user, { ip });
};

export const authenticateUser = async ({ email, password }, { ip } = {}) => {
  const user = await usersService.findByEmailWithPassword(email);

  const passwordOk = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
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
