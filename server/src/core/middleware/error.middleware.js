import ApiError from '../errors/ApiError.js';
import { ERROR_CODES } from '../errors/errorTypes.js';
import { HTTP } from '../constants/httpStatusCodes.js';
import { env } from '../../config/env.js';
import logger from '../../config/logger.js';

export const notFoundHandler = (req, _res, next) => {
  next(new ApiError(HTTP.NOT_FOUND, ERROR_CODES.NOT_FOUND, `Route not found: ${req.method} ${req.originalUrl}`));
};

// Single place where every error becomes a response:
// { success: false, error: { code, message, details? } }
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let apiError = err;

  if (!(err instanceof ApiError)) {
    if (err.name === 'MulterError') {
      const tooLarge = err.code === 'LIMIT_FILE_SIZE';
      const message = tooLarge ? 'Image must be 2 MB or smaller' : 'Invalid file upload';
      apiError = new ApiError(HTTP.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, message, [
        { field: err.field || 'avatar', message },
      ]);
    } else if (err.type === 'entity.parse.failed') {
      apiError = new ApiError(HTTP.BAD_REQUEST, ERROR_CODES.INVALID_JSON, 'Request body is not valid JSON');
    } else if (err.code === 11000) {
      // Duplicate key that slipped past an explicit check (e.g. a race between two requests).
      apiError = new ApiError(HTTP.CONFLICT, ERROR_CODES.EMAIL_TAKEN, 'Resource already exists');
    } else {
      apiError = new ApiError(HTTP.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR, 'Internal server error');
    }
  }

  if (apiError.statusCode >= 500) {
    logger.error(`${err.stack ?? err.message}`);
  }

  const body = {
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details && { details: apiError.details }),
      ...(env.NODE_ENV !== 'production' && apiError.statusCode >= 500 && { stack: err.stack }),
    },
  };

  res.status(apiError.statusCode).json(body);
};
