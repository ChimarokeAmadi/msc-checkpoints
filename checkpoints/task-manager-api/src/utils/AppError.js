// A reusable error class for errors we EXPECT (wrong password, task not found...).
// Throwing `new AppError('Task not found', 404)` anywhere ends up in the
// central error handler, which sends a clean JSON response.

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    // 4xx = the client did something wrong ("fail"), 5xx = our fault ("error")
    this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
    // Marks it as a known, safe-to-show error (unlike a random bug)
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
