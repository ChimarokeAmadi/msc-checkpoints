// Creating the JWT and putting it in an HTTP-only, secure cookie

const jwt = require('jsonwebtoken');
const config = require('../config/config');

const COOKIE_NAME = 'jwt';

function signToken(userId) {
  return jwt.sign({ id: String(userId) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

const cookieOptions = () => ({
  httpOnly: true, // JavaScript in the browser can't read it (protects against XSS stealing it)
  secure: config.cookieSecure, // only sent over HTTPS (browsers treat http://localhost as secure too)
  sameSite: 'lax', // not sent with cross-site POST/DELETE requests (CSRF protection)
  maxAge: config.cookieMaxAgeMs,
  path: '/',
});

function sendTokenCookie(res, user, statusCode, message) {
  res.cookie(COOKIE_NAME, signToken(user._id), cookieOptions());
  // The token is only in the cookie, not in the JSON body
  res.status(statusCode).json({ status: 'success', message, data: { user: user.toPublic() } });
}

function clearTokenCookie(res) {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
}

module.exports = { COOKIE_NAME, signToken, sendTokenCookie, clearTokenCookie };
