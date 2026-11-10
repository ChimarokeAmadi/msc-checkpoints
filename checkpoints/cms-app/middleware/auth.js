// middleware/auth.js
// Login works with a JSON Web Token (JWT): the React app sends it in every
// request as  Authorization: Bearer <token>

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) => jwt.sign({ id: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Only lets the request through with a valid token of an active account
async function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in first' });
  let id;
  try {
    ({ id } = jwt.verify(token, process.env.JWT_SECRET));
  } catch {
    return res.status(401).json({ message: 'Your session has expired, please log in again' });
  }
  const user = await User.findById(id);
  if (!user) return res.status(401).json({ message: 'This account no longer exists' });
  if (!user.active) return res.status(403).json({ message: 'This account has been switched off by an admin' });
  req.user = user;
  next();
}

const requireEditor = (req, res, next) => (req.user.canEdit() ? next() : res.status(403).json({ message: 'Editors only' }));
const requireAdmin = (req, res, next) => (req.user.role === 'admin' ? next() : res.status(403).json({ message: 'Admins only' }));

module.exports = { signToken, requireAuth, requireEditor, requireAdmin };
