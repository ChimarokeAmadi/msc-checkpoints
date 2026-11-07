// Centralized error-handling middleware.
// Every error in the app (thrown, or passed to next()) ends up here, so all
// error responses have the same shape: { status, message }.

const AppError = require('../utils/AppError');
const config = require('../config/config');

// Turn known library errors into friendly AppErrors
function normalize(err) {
  if (err instanceof AppError) return err;

  // Mongoose: an id that isn't a valid ObjectId, e.g. /tasks/123
  if (err.name === 'CastError') {
    return new AppError(`Invalid ${err.path}: ${err.value}`, 400);
  }
  // Mongoose: schema validation failed (missing title, too long...)
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return new AppError(`Invalid input: ${messages.join('. ')}`, 400);
  }
  // MongoDB: unique field already used (email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return new AppError(`This ${field} is already in use.`, 409);
  }
  // JWT problems
  if (err.name === 'JsonWebTokenError') {
    return new AppError('Invalid token. Please log in again.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return new AppError('Your token has expired. Please log in again.', 401);
  }
  // express.json(): broken JSON or body too big
  if (err.type === 'entity.parse.failed') {
    return new AppError('The request body is not valid JSON.', 400);
  }
  if (err.type === 'entity.too.large') {
    return new AppError('The request body is too large.', 413);
  }
  return err; // unknown error = a bug
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const error = normalize(err);
  const statusCode = error.statusCode || 500;

  if (!error.isOperational) {
    // A real bug: log everything for us, show nothing sensitive to the client
    console.error('💥 Unexpected error:', err);
  }

  const body = {
    status: error.status || 'error',
    message: error.isOperational ? error.message : 'Something went wrong. Please try again later.',
  };
  // In development, include the stack trace of real bugs to help debugging
  if (config.env === 'development' && !error.isOperational) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
}

module.exports = errorHandler;
