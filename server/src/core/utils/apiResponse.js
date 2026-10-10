import { HTTP } from '../constants/httpStatusCodes.js';

// Success shape: { success: true, data }. Failures are shaped by error.middleware.js.
export const sendSuccess = (res, data = null, statusCode = HTTP.OK) =>
  res.status(statusCode).json({ success: true, data });
