// models/Category.js
const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, 'Name is required'], trim: true, maxlength: 40 },
    slug: { type: String, required: true, unique: true },
    description: { type: String, default: '', maxlength: 200 },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Category', categorySchema);
