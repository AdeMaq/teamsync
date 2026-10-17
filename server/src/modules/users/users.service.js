import fs from 'fs/promises';
import path from 'path';
import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import { hashPassword, verifyPassword } from '../../core/utils/password.js';
import { AVATAR_URL_PREFIX, avatarsDir } from '../../config/paths.js';
import { eventBus } from '../../events/eventBus.js';
import { EVENTS } from '../../events/eventNames.js';
import * as usersRepository from './users.repository.js';

// ---- API used by other modules (through users/index.js) ----

export const createUser = (data) => usersRepository.createUser(data);

export const findByEmail = (email) => usersRepository.findUserByEmail(email);

export const findByEmailWithPassword = (email) => usersRepository.findUserByEmailWithPassword(email);

export const findById = (id) => usersRepository.findUserById(id);

export const recordLogin = (id) => usersRepository.updateLastLogin(id);

export const setPasswordResetToken = (id, tokenHash, expiresAt) =>
  usersRepository.setPasswordResetToken(id, tokenHash, expiresAt);

export const findByValidResetToken = (tokenHash) => usersRepository.findUserByValidResetToken(tokenHash);

// Used by the reset flow: the caller has already hashed the new password.
export const updatePassword = (id, passwordHash) => usersRepository.updatePasswordAndClearReset(id, passwordHash);

// ---- Profile ----

const notFound = () => new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'User not found');

const fieldError = (statusCode, code, field, message) =>
  new ApiError(statusCode, code, message, [{ field, message }]);

// Sensitive actions re-check the password. Wrong password is a 403 (not 401) on purpose:
// the client treats a 401 as "access token expired" and would try to refresh instead of showing the error.
const assertPassword = async (user, password, field = 'password') => {
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw fieldError(HTTP.FORBIDDEN, ERROR_CODES.INVALID_PASSWORD, field, 'Incorrect password');
  }
};

// Deletes a stored avatar file. Only files inside the avatars folder are ever touched.
const removeAvatarFile = async (avatarUrl) => {
  if (!avatarUrl?.startsWith(AVATAR_URL_PREFIX)) return;
  await fs.unlink(path.join(avatarsDir, path.basename(avatarUrl))).catch(() => {});
};

// The client-supplied mime type can be faked, so check the file's real signature too.
const isRealImage = async (filePath) => {
  const handle = await fs.open(filePath, 'r');
  try {
    const { buffer } = await handle.read(Buffer.alloc(12), 0, 12, 0);
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPng = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isWebp = buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';
    return isJpeg || isPng || isWebp;
  } finally {
    await handle.close();
  }
};

export const getUserProfile = async (id) => {
  const user = await usersRepository.findUserById(id);
  if (!user) throw notFound();
  return user;
};

export const updateProfile = async (userId, { name }) => {
  const updated = await usersRepository.updateUserById(userId, { name });
  if (!updated) throw notFound();
  return updated;
};

export const changeEmail = async (userId, { email, password }) => {
  const user = await usersRepository.findUserByIdWithPassword(userId);
  if (!user) throw notFound();

  await assertPassword(user, password);

  if (user.email === email) {
    throw fieldError(HTTP.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, 'email', 'This is already your email address');
  }
  if (await usersRepository.findUserByEmail(email)) {
    throw fieldError(HTTP.CONFLICT, ERROR_CODES.EMAIL_TAKEN, 'email', 'An account with this email already exists');
  }

  return usersRepository.updateUserById(userId, { email });
};

// Changing the password signs the account out everywhere: auth listens for PASSWORD_CHANGED
// and deletes the refresh tokens. The caller must log in again.
export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await usersRepository.findUserByIdWithPassword(userId);
  if (!user) throw notFound();

  await assertPassword(user, currentPassword, 'currentPassword');

  if (currentPassword === newPassword) {
    throw fieldError(
      HTTP.BAD_REQUEST,
      ERROR_CODES.VALIDATION_ERROR,
      'newPassword',
      'New password must be different from the current one'
    );
  }

  await usersRepository.updatePasswordAndClearReset(userId, await hashPassword(newPassword));
  await eventBus.emit(EVENTS.PASSWORD_CHANGED, { userId });
};

// `file` is the multer result (already written to the avatars folder).
export const setAvatar = async (userId, file) => {
  if (!file) {
    throw fieldError(HTTP.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, 'avatar', 'Choose an image to upload');
  }

  const discardUpload = () => fs.unlink(file.path).catch(() => {});

  if (!(await isRealImage(file.path))) {
    await discardUpload();
    throw fieldError(HTTP.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, 'avatar', 'File is not a valid image');
  }

  const user = await usersRepository.findUserById(userId);
  if (!user) {
    await discardUpload();
    throw notFound();
  }

  const previous = user.avatar;
  const updated = await usersRepository.updateUserById(userId, { avatar: `${AVATAR_URL_PREFIX}${file.filename}` });
  await removeAvatarFile(previous);
  return updated;
};

export const removeAvatar = async (userId) => {
  const user = await usersRepository.findUserById(userId);
  if (!user) throw notFound();

  const updated = await usersRepository.updateUserById(userId, { avatar: '' });
  await removeAvatarFile(user.avatar);
  return updated;
};

// Other modules clean up their own data by listening for USER_DELETED (auth removes the refresh tokens).
export const deleteAccount = async (userId, { password }) => {
  const user = await usersRepository.findUserByIdWithPassword(userId);
  if (!user) throw notFound();

  await assertPassword(user, password);

  await removeAvatarFile(user.avatar);
  await eventBus.emit(EVENTS.USER_DELETED, { userId });
  await usersRepository.deleteUserById(userId);
};
