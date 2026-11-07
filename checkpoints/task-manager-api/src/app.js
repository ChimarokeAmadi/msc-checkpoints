// Builds the Express app. server.js connects to MongoDB and starts it;
// the tests use it directly.

const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');

const { passport } = require('./config/passport');
const { createLimiters } = require('./middleware/rateLimiters');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const AppError = require('./utils/AppError');

function createApp(limiterOptions) {
  const app = express();
  const { authLimiter, apiLimiter } = createLimiters(limiterOptions);

  // --- Security ---
  app.disable('x-powered-by');
  app.use(helmet()); // secure HTTP headers
  app.use(apiLimiter); // basic rate limit on every route

  // --- Reading the request ---
  app.use(express.json({ limit: '10kb' })); // small limit = no huge bodies
  app.use(cookieParser());

  // --- Sanitizing input (must come AFTER the body is parsed) ---
  app.use(mongoSanitize()); // removes keys like "$gt" or "a.b" (NoSQL injection)
  app.use(xss()); // turns <script> etc. into harmless text

  app.use(passport.initialize());

  // --- Routes ---
  app.get('/', (req, res) => {
    res.json({
      status: 'success',
      message: 'Task Manager API',
      endpoints: [
        'POST /auth/signup', 'POST /auth/login', 'POST /auth/logout', 'GET /auth/me',
        'GET /auth/google', 'POST /tasks', 'GET /tasks', 'GET /tasks/:id', 'DELETE /tasks/:id',
      ],
    });
  });
  app.use('/auth', authRoutes({ authLimiter }));
  app.use('/tasks', taskRoutes);

  // Unknown route -> 404, handled like any other error
  app.all('*', (req, res, next) => {
    next(new AppError(`Can't find ${req.method} ${req.originalUrl} on this server.`, 404));
  });

  // --- Centralized error handling (always last) ---
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
