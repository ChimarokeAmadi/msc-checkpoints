// models/Revision.js
// Every time a post is saved, the OLD version is kept here first.
// So nothing written is ever lost, and an editor can restore an older version.

const mongoose = require('mongoose');

const revisionSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true, index: true },
    title: String,
    excerpt: String,
    body: String,
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

module.exports = mongoose.model('Revision', revisionSchema);
