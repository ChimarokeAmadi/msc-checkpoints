// Express 4 does not catch errors thrown inside async functions: the request
// would just hang. catchAsync wraps a route handler and sends any error
// (a rejected promise) to next(), so it reaches the error-handling middleware.
// This way we don't need a try/catch in every controller.

const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
