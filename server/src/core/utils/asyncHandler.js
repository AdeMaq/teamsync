// Forwards rejected promises from async handlers to the error middleware.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export default asyncHandler;
