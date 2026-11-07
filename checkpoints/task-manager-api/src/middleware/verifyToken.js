// Protects private routes: only lets the request through if it carries a valid JWT.
// The token is read from the HTTP-only cookie (or an "Authorization: Bearer ..."
// header, which is handy for tools like Postman).

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const config = require('../config/config');
const { COOKIE_NAME } = require('../utils/token');

const verifyToken = catchAsync(async (req, res, next) => {
  let token = req.cookies?.[COOKIE_NAME];
  const header = req.headers.authorization;
  if (!token && header?.startsWith('Bearer ')) {
    token = header.slice(7);
  }

  if (!token) {
    throw new AppError('You are not logged in. Please log in to get access.', 401);
  }

  // Throws JsonWebTokenError / TokenExpiredError, which the error handler turns into 401
  const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });

  // The user might have been deleted after the token was created
  const user = await User.findById(payload.id);
  if (!user) {
    throw new AppError('The user for this token no longer exists.', 401);
  }

  req.user = user;
  next();
});

module.exports = verifyToken;
