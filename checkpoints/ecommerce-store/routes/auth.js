// routes/auth.js
// POST /api/auth/register, POST /api/auth/login, GET /api/auth/me

const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

// The account using ADMIN_EMAIL (set in .env / Azure) becomes the shop admin
const isAdminEmail = (email) =>
  Boolean(process.env.ADMIN_EMAIL) && String(email).trim().toLowerCase() === process.env.ADMIN_EMAIL.trim().toLowerCase();

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body ?? {};
  if (typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ message: 'The password must have at least 8 characters' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, isAdmin: isAdminEmail(email) });
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  const user = typeof email === 'string' ? await User.findOne({ email: email.trim().toLowerCase() }) : null;
  // Same message whether the email or the password is wrong, so nobody can
  // find out which emails have an account
  if (!user || typeof password !== 'string' || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).json({ message: 'Wrong email or password' });
  }
  // If ADMIN_EMAIL was set after this account was created, promote it now
  if (!user.isAdmin && isAdminEmail(user.email)) {
    user.isAdmin = true;
    await user.save();
  }
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = router;
