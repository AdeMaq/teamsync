import ApiError from '../errors/ApiError.js';
import { ERROR_CODES } from '../errors/errorTypes.js';
import { HTTP } from '../constants/httpStatusCodes.js';

// validate({ body, params, query }) with Joi schemas.
// Unknown keys are stripped. Validated body replaces req.body; params/query land in req.valid.
export const validate = (schemas) => (req, _res, next) => {
  const details = [];

  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;

    const { value, error } = schemas[key].validate(req[key] ?? {}, {
      abortEarly: false,
      stripUnknown: true,
      convert: true,
    });

    if (error) {
      details.push(
        ...error.details.map((d) => ({
          field: d.path.join('.'),
          message: d.message.replace(/"/g, ''),
        }))
      );
    } else if (key === 'body') {
      req.body = value;
    } else {
      req.valid = { ...req.valid, [key]: value };
    }
  }

  if (details.length > 0) {
    return next(new ApiError(HTTP.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, 'Validation failed', details));
  }
  next();
};
