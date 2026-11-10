// models/Post.js
// The main content of the CMS. A "post" is a blog article (shown on the home
// page, by date); a "page" is a fixed page like About (shown in the menu).
// The body is written in Markdown.

const mongoose = require('mongoose');

const STATUSES = ['draft', 'review', 'published'];

const postSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['post', 'page'], default: 'post' },
    title: { type: String, required: [true, 'Title is required'], trim: true, maxlength: 140 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(-[a-z0-9]+)*$/, 'The URL can only have lowercase letters, numbers and dashes'],
    },
    excerpt: { type: String, default: '', trim: true, maxlength: 300 },
    body: { type: String, default: '', maxlength: 100000 },
    // A cover from this site (/covers/...) or a full https:// link
    cover: {
      type: String,
      default: '',
      trim: true,
      match: [/^$|^\/[\w\-./]+$|^https:\/\/\S+$/, 'The cover must be a /covers/... path or an https:// link'],
    },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    tags: {
      type: [{ type: String, trim: true, lowercase: true, maxlength: 30 }],
      validate: [(a) => a.length <= 10, 'At most 10 tags'],
    },
    status: { type: String, enum: STATUSES, default: 'draft' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    publishedAt: { type: Date, default: null },
    menuOrder: { type: Number, default: 0 }, // order of pages in the menu
  },
  { timestamps: true },
);

postSchema.index({ type: 1, status: 1, publishedAt: -1 });
postSchema.index({ tags: 1 });

// Reading time, about 200 words a minute
postSchema.virtual('readingMinutes').get(function () {
  const words = (this.body || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
});
postSchema.set('toJSON', { virtuals: true, transform: (doc, ret) => (delete ret.__v, delete ret.id, ret) });

// "Hello, World!" -> "hello-world"
postSchema.statics.slugify = (text) =>
  String(text)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80)
    .replace(/-$/, '');

// Finds a free slug: "my-post", then "my-post-2", "my-post-3"...
postSchema.statics.uniqueSlug = async function (base, exceptId) {
  const root = base || 'untitled';
  for (let n = 1; ; n++) {
    const slug = n === 1 ? root : `${root}-${n}`;
    const taken = await this.exists({ slug, ...(exceptId ? { _id: { $ne: exceptId } } : {}) });
    if (!taken) return slug;
  }
};

module.exports = mongoose.model('Post', postSchema);
module.exports.STATUSES = STATUSES;
