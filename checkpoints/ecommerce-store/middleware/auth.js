// middleware/auth.js
// Login works with a JSON Web Token (JWT). After login, the React app sends it
// back in every request as:  Authorization: Bearer <token>

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const secret = () => process.env.JWT_SECRET;

function signToken(user) {
  return jwt.sign({ id: user._id.toString() }, secret(), { expiresIn: '7d' });
}

// Only lets the request through if a valid token is sent. Puts the user in req.user.
async function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in first' });
  try {
    const { id } = jwt.verify(token, secret());
    const user = await User.findById(id);
    if (!user) return res.status(401).json({ message: 'This account no longer exists' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: 'Your session has expired, please log in again' });
  }
}

// Use after requireAuth: only admins get through
function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ message: 'Admins only' });
  next();
}

module.exports = { signToken, requireAuth, requireAdmin };
