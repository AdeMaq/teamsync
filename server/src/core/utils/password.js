import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';

// Cost 12 in real use. Tests use a low cost only so the suite stays fast; the hashes are still real bcrypt.
const ROUNDS = env.NODE_ENV === 'test' ? 4 : 12;

export const hashPassword = (password) => bcrypt.hash(password, ROUNDS);

export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

// Compared against when an account does not exist, so "unknown email" and "wrong password"
// take the same time and cannot be told apart.
export const DUMMY_HASH = bcrypt.hashSync('timing-equalizer', ROUNDS);
