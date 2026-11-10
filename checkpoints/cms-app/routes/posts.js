// routes/posts.js
// Writing and managing content (login needed). Mounted at /api/posts.
//
//   GET    /api/posts                     list (authors only see their own)
//   GET    /api/posts/:id                 one post, for the editor
//   POST   /api/posts                     create
//   PUT    /api/posts/:id                 save changes (keeps the old version as a revision)
//   DELETE /api/posts/:id
//   GET    /api/posts/:id/revisions       older versions
//   POST   /api/posts/:id/revisions/:rev/restore
//
// Who can do what:
//   - an author can write posts, save them as drafts and send them for review,
//     and change or delete their own posts until they are published;
//   - editors and admins can do everything, including publishing and pages.

const express = require('express');
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Revision = require('../models/Revision');
const Comment = require('../models/Comment');
const Category = require('../models/Category');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

const KEEP_REVISIONS = 20;

// Can this user change (or delete) this post?
function canModify(user, post) {
  if (user.canEdit()) return true;
  return post.author.equals(user._id) && post.status !== 'published' && post.type === 'post';
}

// Loads a post the user is allowed to see, or answers 400/404
async function loadPost(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid post id' });
    return null;
  }
  const post = await Post.findById(req.params.id);
  // An author asking for someone else's post gets 404, like it doesn't exist
  if (!post || (!req.user.canEdit() && !post.author.equals(req.user._id))) {
    res.status(404).json({ message: 'Post not found' });
    return null;
  }
  return post;
}

// Takes only the fields a user may set, and checks the rules for each role
async function readFields(req, res, existing) {
  const b = req.body ?? {};
  const out = {};
  for (const k of ['title', 'excerpt', 'body', 'cover', 'menuOrder']) if (b[k] !== undefined) out[k] = b[k];
  if (b.tags !== undefined) {
    const list = Array.isArray(b.tags) ? b.tags : String(b.tags).split(',');
    out.tags = [...new Set(list.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
  }
  if (b.category !== undefined) {
    if (b.category === null || b.category === '') out.category = null;
    else if (!mongoose.isValidObjectId(b.category) || !(await Category.exists({ _id: b.category }))) {
      res.status(400).json({ message: 'This category does not exist' });
      return null;
    } else out.category = b.category;
  }
  if (b.type !== undefined) {
    if (b.type === 'page' && !req.user.canEdit()) {
      res.status(403).json({ message: 'Only editors can make pages' });
      return null;
    }
    out.type = b.type;
  }
  if (b.status !== undefined) {
    if (b.status === 'published' && !req.user.canEdit()) {
      res.status(403).json({ message: 'Only editors can publish. Send it for review instead.' });
      return null;
    }
    out.status = b.status;
    if (b.status === 'published' && !existing?.publishedAt) out.publishedAt = new Date();
  }
  if (b.slug !== undefined && b.slug !== existing?.slug) {
    const wanted = Post.slugify(b.slug);
    if (!wanted) {
      res.status(400).json({ message: 'The URL can only have lowercase letters, numbers and dashes' });
      return null;
    }
    if (await Post.exists({ slug: wanted, _id: { $ne: existing?._id } })) {
      res.status(409).json({ message: `The URL "/${wanted}" is already used by another post` });
      return null;
    }
    out.slug = wanted;
  }
  return out;
}

router.get('/', async (req, res) => {
  const filter = {};
  if (!req.user.canEdit()) filter.author = req.user._id;
  else if (req.query.mine === 'true') filter.author = req.user._id;
  if (['draft', 'review', 'published'].includes(req.query.status)) filter.status = req.query.status;
  if (['post', 'page'].includes(req.query.type)) filter.type = req.query.type;
  if (typeof req.query.search === 'string' && req.query.search.trim()) {
    filter.title = new RegExp(req.query.search.trim().slice(0, 60).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  const posts = await Post.find(filter, '-body').sort({ updatedAt: -1 }).populate('author', 'name').populate('category', 'name');
  res.json(posts);
});

router.get('/:id', async (req, res) => {
  const post = await loadPost(req, res);
  if (!post) return;
  await post.populate('author', 'name');
  res.json({ post, canModify: canModify(req.user, post) });
});

router.post('/', async (req, res) => {
  const fields = await readFields(req, res, null);
  if (!fields) return;
  const slug = fields.slug ?? (await Post.uniqueSlug(Post.slugify(fields.title ?? '')));
  const post = await Post.create({ ...fields, slug, author: req.user._id });
  res.status(201).json(post);
});

router.put('/:id', async (req, res) => {
  const post = await loadPost(req, res);
  if (!post) return;
  if (!canModify(req.user, post)) {
    return res.status(403).json({ message: 'This post is published: only an editor can change it now' });
  }
  const fields = await readFields(req, res, post);
  if (!fields) return;

  // Keep the old text as a revision if the text changes
  const textChanged = ['title', 'excerpt', 'body'].some((k) => fields[k] !== undefined && fields[k] !== post[k]);
  if (textChanged) {
    await Revision.create({ post: post._id, title: post.title, excerpt: post.excerpt, body: post.body, editedBy: req.user._id });
    const old = await Revision.find({ post: post._id }, '_id').sort({ createdAt: -1, _id: -1 }).skip(KEEP_REVISIONS);
    if (old.length) await Revision.deleteMany({ _id: { $in: old.map((r) => r._id) } });
  }
  post.set(fields);
  await post.save();
  res.json(post);
});

router.delete('/:id', async (req, res) => {
  const post = await loadPost(req, res);
  if (!post) return;
  if (!canModify(req.user, post)) return res.status(403).json({ message: 'Only an editor can delete a published post' });
  await Promise.all([post.deleteOne(), Revision.deleteMany({ post: post._id }), Comment.deleteMany({ post: post._id })]);
  res.json({ message: 'Post deleted' });
});

router.get('/:id/revisions', async (req, res) => {
  const post = await loadPost(req, res);
  if (!post) return;
  res.json(await Revision.find({ post: post._id }).sort({ createdAt: -1, _id: -1 }).populate('editedBy', 'name'));
});

router.post('/:id/revisions/:rev/restore', async (req, res) => {
  const post = await loadPost(req, res);
  if (!post) return;
  if (!canModify(req.user, post)) return res.status(403).json({ message: 'Only an editor can change a published post' });
  if (!mongoose.isValidObjectId(req.params.rev)) return res.status(400).json({ message: 'Invalid revision id' });
  const rev = await Revision.findOne({ _id: req.params.rev, post: post._id });
  if (!rev) return res.status(404).json({ message: 'Revision not found' });
  // The current text becomes a revision too, so restoring can be undone
  await Revision.create({ post: post._id, title: post.title, excerpt: post.excerpt, body: post.body, editedBy: req.user._id });
  post.set({ title: rev.title, excerpt: rev.excerpt, body: rev.body });
  await post.save();
  res.json(post);
});

module.exports = router;
