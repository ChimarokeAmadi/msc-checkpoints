// routes/products.js
// Public:  GET /api/products, GET /api/products/categories, GET /api/products/:slug
// Admin:   POST /api/products, PUT /api/products/:id, DELETE /api/products/:id

const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const { CATEGORIES } = require('../models/Product');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

const SORTS = {
  newest: { createdAt: -1, _id: 1 },
  'price-asc': { price: 1, _id: 1 },
  'price-desc': { price: -1, _id: 1 },
  name: { name: 1, _id: 1 },
};

// Characters like "(" or "*" have a special meaning in a regex, so escape them
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/products?search=mug&category=Kitchen&sort=price-asc&page=1&limit=12&featured=true
router.get('/', async (req, res) => {
  const { search, category, sort = 'newest', featured } = req.query;
  const filter = {};
  if (typeof search === 'string' && search.trim()) {
    const re = new RegExp(escapeRegex(search.trim().slice(0, 50)), 'i');
    filter.$or = [{ name: re }, { description: re }, { category: re }];
  }
  if (typeof category === 'string' && category) filter.category = category;
  if (featured === 'true') filter.featured = true;

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const [products, total] = await Promise.all([
    Product.find(filter).sort(SORTS[sort] ?? SORTS.newest).skip((page - 1) * limit).limit(limit),
    Product.countDocuments(filter),
  ]);
  res.json({ products, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
});

// GET /api/products/categories : every category with how many products it has
router.get('/categories', async (req, res) => {
  const counts = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
  const byName = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  res.json(CATEGORIES.map((name) => ({ name, count: byName[name] ?? 0 })));
});

router.get('/:slug', async (req, res) => {
  const product = await Product.findOne({ slug: req.params.slug });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

// Only these fields can be set from the admin form
function pickFields(body = {}) {
  const out = {};
  for (const key of ['name', 'description', 'category', 'price', 'stock', 'image', 'featured']) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  const fields = pickFields(req.body);
  const product = await Product.create({ ...fields, slug: Product.slugify(fields.name ?? '') || undefined });
  res.status(201).json(product);
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product id' });
  // The slug stays the same when the name changes, so old links keep working
  const product = await Product.findByIdAndUpdate(req.params.id, pickFields(req.body), {
    returnDocument: 'after',
    runValidators: true,
  });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: 'Invalid product id' });
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ message: 'Product deleted', product });
});

module.exports = router;
