// routes/manage.js
// The rest of the dashboard (login needed). Mounted at /api.
//
//   GET    /api/stats                         numbers for the dashboard
//   GET    /api/categories                    (anyone logged in, for the post editor)
//   POST   /api/categories   PUT/DELETE /api/categories/:id      (editors)
//   GET    /api/comments?status=              PATCH/DELETE /api/comments/:id   (editors)
//   GET    /api/users        PATCH /api/users/:id                (admin)

const express = require('express');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Category = require('../models/Category');
const Comment = require('../models/Comment');
const User = require('../models/User');
const { ROLES } = require('../models/User');
const { requireAuth, requireEditor, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(['/stats', '/categories', '/comments', '/users'], requireAuth);

const badId = (res, id, what) => {
  if (mongoose.isValidObjectId(id)) return false;
  res.status(400).json({ message: `Invalid ${what} id` });
  return true;
};

// ---------------------------------------------------------------- stats
router.get('/stats', async (req, res) => {
  const mine = req.user.canEdit() ? {} : { author: req.user._id };
  const [byStatus, pages, pendingComments, users] = await Promise.all([
    Post.aggregate([{ $match: { type: 'post', ...mine } }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    Post.countDocuments({ type: 'page', ...mine }),
    req.user.canEdit() ? Comment.countDocuments({ status: 'pending' }) : 0,
    req.user.role === 'admin' ? User.countDocuments() : 0,
  ]);
  const posts = { draft: 0, review: 0, published: 0 };
  for (const s of byStatus) posts[s._id] = s.n;
  res.json({ posts, pages, pendingComments, users });
});

// ---------------------------------------------------------------- categories
router.get('/categories', async (req, res) => {
  const [cats, counts] = await Promise.all([
    Category.find().sort({ name: 1 }),
    Post.aggregate([{ $group: { _id: '$category', n: { $sum: 1 } } }]),
  ]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json(cats.map((c) => ({ ...c.toJSON(), posts: byId[String(c._id)] ?? 0 })));
});

router.post('/categories', requireEditor, async (req, res) => {
  const { name, description } = req.body ?? {};
  const slug = Post.slugify(name ?? '');
  if (!slug) return res.status(400).json({ message: 'Name is required' });
  res.status(201).json(await Category.create({ name, description, slug }));
});

router.put('/categories/:id', requireEditor, async (req, res) => {
  if (badId(res, req.params.id, 'category')) return;
  const { name, description } = req.body ?? {};
  const cat = await Category.findByIdAndUpdate(
    req.params.id,
    { ...(name !== undefined ? { name } : {}), ...(description !== undefined ? { description } : {}) },
    { returnDocument: 'after', runValidators: true },
  );
  if (!cat) return res.status(404).json({ message: 'Category not found' });
  res.json(cat);
});

router.delete('/categories/:id', requireEditor, async (req, res) => {
  if (badId(res, req.params.id, 'category')) return;
  const used = await Post.countDocuments({ category: req.params.id });
  if (used) return res.status(409).json({ message: `${used} post(s) still use this category. Move them first.` });
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) return res.status(404).json({ message: 'Category not found' });
  res.json({ message: 'Category deleted' });
});

// ---------------------------------------------------------------- comments
router.get('/comments', requireEditor, async (req, res) => {
  const filter = ['pending', 'approved'].includes(req.query.status) ? { status: req.query.status } : {};
  res.json(await Comment.find(filter).sort({ createdAt: -1 }).limit(200).populate('post', 'title slug'));
});

router.patch('/comments/:id', requireEditor, async (req, res) => {
  if (badId(res, req.params.id, 'comment')) return;
  const { status } = req.body ?? {};
  if (!['pending', 'approved'].includes(status)) return res.status(400).json({ message: 'Status must be pending or approved' });
  const c = await Comment.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' }).populate('post', 'title slug');
  if (!c) return res.status(404).json({ message: 'Comment not found' });
  res.json(c);
});

router.delete('/comments/:id', requireEditor, async (req, res) => {
  if (badId(res, req.params.id, 'comment')) return;
  const c = await Comment.findByIdAndDelete(req.params.id);
  if (!c) return res.status(404).json({ message: 'Comment not found' });
  res.json({ message: 'Comment deleted' });
});

// ---------------------------------------------------------------- users (admin)
router.get('/users', requireAdmin, async (req, res) => {
  const [users, counts] = await Promise.all([
    User.find().sort({ createdAt: 1 }),
    Post.aggregate([{ $group: { _id: '$author', n: { $sum: 1 } } }]),
  ]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json(users.map((u) => ({ ...u.toJSON(), posts: byId[String(u._id)] ?? 0 })));
});

router.patch('/users/:id', requireAdmin, async (req, res) => {
  if (badId(res, req.params.id, 'user')) return;
  // An admin can't remove their own rights by mistake (there must always be an admin)
  if (req.user._id.equals(req.params.id)) return res.status(400).json({ message: "You can't change your own role or switch yourself off" });
  const { role, active } = req.body ?? {};
  const changes = {};
  if (role !== undefined) {
    if (!ROLES.includes(role)) return res.status(400).json({ message: `Role must be one of: ${ROLES.join(', ')}` });
    changes.role = role;
  }
  if (active !== undefined) changes.active = Boolean(active);
  const user = await User.findByIdAndUpdate(req.params.id, changes, { returnDocument: 'after' });
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

module.exports = router;
