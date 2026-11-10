// models/Comment.js
// Visitors can comment without an account. New comments wait in "pending"
// until an editor approves them, so spam never shows up on the site.

const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    name: { type: String, required: [true, 'Your name is required'], trim: true, maxlength: 60 },
    body: { type: String, required: [true, 'The comment is empty'], trim: true, maxlength: 2000 },
    status: { type: String, enum: ['pending', 'approved'], default: 'pending' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('Comment', commentSchema);
