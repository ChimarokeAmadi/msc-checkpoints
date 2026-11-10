// routes/auth.js
// POST /api/auth/register, POST /api/auth/login, GET /api/auth/me, PUT /api/auth/me

const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// The account using ADMIN_EMAIL (set in .env / Azure) becomes the admin.
// Everyone else who signs up starts as an author: they can write, but an
// editor has to publish their posts.
const isAdminEmail = (email) =>
  Boolean(process.env.ADMIN_EMAIL) && String(email).trim().toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'The password must have at least 8 characters' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: isAdminEmail(email) ? 'admin' : 'author' });
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = typeof email === 'string' ? await User.findOne({ email: email.trim().toLowerCase() }) : null;
  // Same message for a wrong email or a wrong password
  if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Wrong email or password' });
  }
  if (!user.active) return res.status(403).json({ message: 'This account has been switched off by an admin' });
  if (user.role !== 'admin' && isAdminEmail(user.email)) {
    user.role = 'admin';
    await user.save();
  }
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

// Change my own name and bio (shown under my posts)
router.put('/me', requireAuth, async (req, res) => {
  const { name, bio } = req.body ?? {};
  if (name !== undefined) req.user.name = name;
  if (bio !== undefined) req.user.bio = bio;
  await req.user.save();
  res.json({ user: req.user });
});

module.exports = router;
