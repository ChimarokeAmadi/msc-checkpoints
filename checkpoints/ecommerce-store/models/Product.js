// models/Product.js
// A product in the shop. "slug" is the readable id used in the URL
// (e.g. /products/ceramic-coffee-mug).

const mongoose = require('mongoose');

const CATEGORIES = ['Kitchen', 'Bags', 'Tech', 'Home', 'Stationery', 'Fashion'];

// Prices are kept with 2 decimals (no 19.999999 surprises)
const money = (v) => Math.round(Number(v) * 100) / 100;

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 100 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, default: '', maxlength: 2000 },
    category: { type: String, required: true, enum: { values: CATEGORIES, message: 'Unknown category' } },
    price: { type: Number, required: [true, 'Price is required'], min: [0.01, 'Price must be more than 0'], set: money },
    stock: { type: Number, default: 0, min: [0, 'Stock cannot be negative'], validate: Number.isInteger },
    // A picture from this site (/products/...) or a full https:// link
    image: {
      type: String,
      default: '/products/placeholder.svg',
      trim: true,
      match: [/^(\/[\w\-./]+|https:\/\/\S+)$/, 'The picture must be a /products/... path or an https:// link'],
    },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Indexes for the shop page filters and sorting
productSchema.index({ category: 1, price: 1 });
productSchema.index({ featured: 1 });

// Turns "Ceramic Coffee Mug!" into "ceramic-coffee-mug"
productSchema.statics.slugify = (text) =>
  String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
module.exports.CATEGORIES = CATEGORIES;
module.exports.money = money;
