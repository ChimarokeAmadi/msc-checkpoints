const express = require('express');
const auth = require('../controllers/authController');
const verifyToken = require('../middleware/verifyToken');
const AppError = require('../utils/AppError');
const { passport, googleEnabled } = require('../config/passport');

module.exports = function authRoutes({ authLimiter }) {
  const router = express.Router();

  router.post('/signup', authLimiter, auth.signup);
  router.post('/login', authLimiter, auth.login);
  router.post('/logout', auth.logout);
  router.get('/me', verifyToken, auth.me);

  // Google OAuth: only works when GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
  const requireGoogle = (req, res, next) =>
    googleEnabled ? next() : next(new AppError('Google login is not configured on this server.', 503));

  // 1. Send the user to Google's login page
  router.get(
    '/google',
    requireGoogle,
    passport.authenticate('google', { scope: ['profile', 'email'], session: false, prompt: 'select_account' }),
  );

  // 2. Google sends them back here, Passport checks them, then we set our JWT cookie
  router.get(
    '/google/callback',
    requireGoogle,
    (req, res, next) => {
      passport.authenticate('google', { session: false }, (err, user, info) => {
        if (err) return next(err);
        if (!user) return next(new AppError(info?.message || 'Google login failed.', 401));
        req.user = user;
        next();
      })(req, res, next);
    },
    auth.googleCallback,
  );

  return router;
};
