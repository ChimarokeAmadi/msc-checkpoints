// routes/public.js
// What visitors of the website can read (no login needed). Only PUBLISHED
// content is ever returned here: drafts and posts in review stay private.
//
//   GET  /api/public/posts?search=&category=&tag=&page=
//   GET  /api/public/posts/:slug        (a post or a page, with its approved comments)
//   GET  /api/public/pages              (pages for the menu)
//   GET  /api/public/categories
//   POST /api/public/posts/:slug/comments

const express = require('express');
const Post = require('../models/Post');
const Category = require('../models/Category');
const Comment = require('../models/Comment');

const router = express.Router();
const PER_PAGE = 6;
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const LIST_FIELDS = 'type title slug excerpt cover category tags author publishedAt body';

router.get('/posts', async (req, res) => {
  const filter = { type: 'post', status: 'published' };
  const { search, category, tag } = req.query;
  if (typeof search === 'string' && search.trim()) {
    const re = new RegExp(escapeRegex(search.trim().slice(0, 60)), 'i');
    filter.$or = [{ title: re }, { excerpt: re }, { body: re }, { tags: re }];
  }
  if (typeof category === 'string' && category) {
    const cat = await Category.findOne({ slug: category });
    filter.category = cat?._id ?? null;
    if (!cat) return res.json({ posts: [], total: 0, page: 1, pages: 1 });
  }
  if (typeof tag === 'string' && tag) filter.tags = tag.toLowerCase();

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const [posts, total] = await Promise.all([
    Post.find(filter, LIST_FIELDS)
      .sort({ publishedAt: -1, _id: -1 })
      .skip((page - 1) * PER_PAGE)
      .limit(PER_PAGE)
      .populate('author', 'name')
      .populate('category', 'name slug'),
    Post.countDocuments(filter),
  ]);
  // The list doesn't need the whole body, only the reading time
  const light = posts.map((p) => {
    const json = p.toJSON();
    delete json.body;
    return json;
  });
  res.json({ posts: light, total, page, pages: Math.max(Math.ceil(total / PER_PAGE), 1) });
});

router.get('/posts/:slug', async (req, res) => {
  const post = await Post.findOne({ slug: req.params.slug, status: 'published' })
    .populate('author', 'name bio')
    .populate('category', 'name slug');
  if (!post) return res.status(404).json({ message: 'This page does not exist' });
  const comments = await Comment.find({ post: post._id, status: 'approved' }, 'name body createdAt').sort({ createdAt: 1 });
  res.json({ post, comments });
});

router.get('/pages', async (req, res) => {
  res.json(await Post.find({ type: 'page', status: 'published' }, 'title slug').sort({ menuOrder: 1, title: 1 }));
});

router.get('/categories', async (req, res) => {
  const [cats, counts] = await Promise.all([
    Category.find().sort({ name: 1 }),
    Post.aggregate([{ $match: { type: 'post', status: 'published' } }, { $group: { _id: '$category', n: { $sum: 1 } } }]),
  ]);
  const byId = Object.fromEntries(counts.map((c) => [String(c._id), c.n]));
  res.json(cats.map((c) => ({ name: c.name, slug: c.slug, description: c.description, count: byId[String(c._id)] ?? 0 })));
});

// A tiny rate limit: each visitor (IP address) can post 5 comments every 10 minutes
const recent = new Map();
function tooMany(ip) {
  const now = Date.now();
  const list = (recent.get(ip) ?? []).filter((t) => now - t < 10 * 60 * 1000);
  if (list.length >= 5) return true;
  list.push(now);
  recent.set(ip, list);
  if (recent.size > 5000) recent.clear(); // never let the map grow forever
  return false;
}

router.post('/posts/:slug/comments', async (req, res) => {
  const { name, body, website } = req.body ?? {};
  // "website" is a hidden field in the form: people can't see it, but spam
  // bots fill in every field. If it has a value, pretend it worked and drop it.
  if (website) return res.status(201).json({ message: 'Thanks! Your comment will appear after a moderator approves it.' });
  if (tooMany(req.ip)) return res.status(429).json({ message: 'Too many comments, please wait a few minutes' });
  const post = await Post.findOne({ slug: req.params.slug, status: 'published' });
  if (!post) return res.status(404).json({ message: 'This page does not exist' });
  await Comment.create({ post: post._id, name, body });
  res.status(201).json({ message: 'Thanks! Your comment will appear after a moderator approves it.' });
});

module.exports = router;
module.exports.resetRateLimit = () => recent.clear();
