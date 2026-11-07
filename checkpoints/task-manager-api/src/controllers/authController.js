const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sendTokenCookie, clearTokenCookie } = require('../utils/token');

const asText = (value) => (typeof value === 'string' ? value.trim() : '');

// POST /auth/signup
exports.signup = catchAsync(async (req, res) => {
  const name = asText(req.body.name);
  const email = asText(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!name || !email || !password) {
    throw new AppError('Please provide name, email and password.', 400);
  }
  if (password.length < 8) {
    throw new AppError('Password must be at least 8 characters.', 400);
  }

  // Only the fields we expect: nobody can sneak in e.g. a googleId
  const user = await User.create({ name, email, password });
  sendTokenCookie(res, user, 201, 'Account created');
});

// POST /auth/login
exports.login = catchAsync(async (req, res) => {
  const email = asText(req.body.email).toLowerCase();
  const password = typeof req.body.password === 'string' ? req.body.password : '';

  if (!email || !password) {
    throw new AppError('Please provide email and password.', 400);
  }

  const user = await User.findOne({ email }).select('+password');
  // Same message for "no such user" and "wrong password", so attackers
  // can't find out which emails are registered
  if (!user || !(await user.checkPassword(password))) {
    throw new AppError('Incorrect email or password.', 401);
  }

  sendTokenCookie(res, user, 200, 'Logged in');
});

// GET /auth/google/callback (after Passport has checked the user with Google)
exports.googleCallback = (req, res) => {
  sendTokenCookie(res, req.user, 200, 'Logged in with Google');
};

// POST /auth/logout
exports.logout = (req, res) => {
  clearTokenCookie(res);
  res.status(200).json({ status: 'success', message: 'Logged out' });
};

// GET /auth/me (protected)
exports.me = (req, res) => {
  res.status(200).json({ status: 'success', data: { user: req.user.toPublic() } });
};
