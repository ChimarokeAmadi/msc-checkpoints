// seed.js
// Adds the starter content (data/content.js) when the database has no posts
// yet, so a fresh Atlas database fills itself on the first start.
// The starter posts belong to an "Inkwell Team" account that nobody can log
// in to (its password hash isn't a real bcrypt hash).

const Post = require('./models/Post');
const Category = require('./models/Category');
const User = require('./models/User');
const { categories, posts } = require('./data/content');

async function seedIfEmpty() {
  if ((await Post.estimatedDocumentCount()) > 0) return 0;

  const team =
    (await User.findOne({ email: 'team@inkwell.invalid' })) ??
    (await User.create({ name: 'Inkwell Team', email: 'team@inkwell.invalid', passwordHash: '!no-login', role: 'editor', bio: 'The people behind this little CMS.' }));

  const catIds = {};
  for (const c of categories) {
    const slug = Post.slugify(c.name);
    const doc = (await Category.findOne({ slug })) ?? (await Category.create({ ...c, slug }));
    catIds[c.name] = doc._id;
  }

  // Spread the publish dates over the last weeks, newest last in the list
  const now = Date.now();
  const docs = posts.map((p, i) => ({
    ...p,
    slug: p.slug ?? Post.slugify(p.title),
    category: p.category ? catIds[p.category] : null,
    status: 'published',
    author: team._id,
    publishedAt: new Date(now - (posts.length - i) * 4 * 24 * 3600 * 1000),
  }));
  await Post.insertMany(docs);
  console.log(`Added ${docs.length} starter posts and pages`);
  return docs.length;
}

module.exports = { seedIfEmpty };
