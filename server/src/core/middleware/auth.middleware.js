import jwt from 'jsonwebtoken';
import ApiError from '../errors/ApiError.js';
import { ERROR_CODES } from '../errors/errorTypes.js';
import { HTTP } from '../constants/httpStatusCodes.js';
import { verifyAccessToken } from '../utils/generateToken.js';

// Requires "Authorization: Bearer <accessToken>". Sets req.user = { id }.
export const requireAuth = (req, _res, next) => {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(HTTP.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED, 'Authentication required'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub };
    next();
  } catch (err) {
    const expired = err instanceof jwt.TokenExpiredError;
    next(
      new ApiError(
        HTTP.UNAUTHORIZED,
        expired ? ERROR_CODES.TOKEN_EXPIRED : ERROR_CODES.INVALID_TOKEN,
        expired ? 'Access token expired' : 'Invalid access token'
      )
    );
  }
};
