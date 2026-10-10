import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

// Access token: short-lived, carries only the user id.
export const signAccessToken = (userId) =>
  jwt.sign({ sub: String(userId) }, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_EXPIRY });

// Refresh token: signed JWT carrying the token family. A random jwtid keeps every token unique,
// even when two are issued in the same second.
export const signRefreshToken = (userId, family) =>
  jwt.sign({ sub: String(userId), family }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRY,
    jwtid: crypto.randomBytes(16).toString('hex'),
  });

export const verifyAccessToken = (token) => jwt.verify(token, env.JWT_ACCESS_SECRET);
export const verifyRefreshToken = (token) => jwt.verify(token, env.JWT_REFRESH_SECRET);

// Expiry (as a Date) read back from a token we just signed.
export const getTokenExpiry = (token) => new Date(jwt.decode(token).exp * 1000);

// Refresh tokens are stored hashed, so a database leak does not expose usable tokens.
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

export const newTokenFamily = () => crypto.randomUUID();
