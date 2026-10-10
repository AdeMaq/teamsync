import ApiError from '../../core/errors/ApiError.js';
import { ERROR_CODES } from '../../core/errors/errorTypes.js';
import { HTTP } from '../../core/constants/httpStatusCodes.js';
import * as usersRepository from './users.repository.js';

export const createUser = (data) => usersRepository.createUser(data);

export const findByEmail = (email) => usersRepository.findUserByEmail(email);

export const findByEmailWithPassword = (email) => usersRepository.findUserByEmailWithPassword(email);

export const findById = (id) => usersRepository.findUserById(id);

export const recordLogin = (id) => usersRepository.updateLastLogin(id);

export const getUserProfile = async (id) => {
  const user = await usersRepository.findUserById(id);
  if (!user) {
    throw new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, 'User not found');
  }
  return user;
};
