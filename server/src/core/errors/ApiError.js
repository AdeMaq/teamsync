// Expected (operational) error. Thrown anywhere; formatted by error.middleware.js.
export default class ApiError extends Error {
  /**
   * @param {number} statusCode HTTP status
   * @param {string} code       one of ERROR_CODES
   * @param {string} message    safe to show to the client
   * @param {Array<{field: string, message: string}>} [details]
   */
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace?.(this, this.constructor);
  }
}
