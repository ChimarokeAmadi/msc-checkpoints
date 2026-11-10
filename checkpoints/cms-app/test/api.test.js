// test/api.test.js
// Tests the whole CMS API against a temporary in-memory MongoDB.
// Run with: npm test

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'boss@inkwell.test';
const { app } = require('../server');
const { seedIfEmpty } = require('../seed');
const { resetRateLimit } = require('../routes/public');

let mongod, server, base;
let admin, editor, author, other, catId;

async function api(method, url, { body, token } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}
const register = async (name, email) => (await api('POST', '/api/auth/register', { body: { name, email, password: 'password123' } })).body;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('cms_test'));
  await seedIfEmpty();
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
  admin = await register('Boss', 'boss@inkwell.test');
  editor = await register('Eddie', 'eddie@inkwell.test');
  author = await register('Ada', 'ada@inkwell.test');
  other = await register('Otto', 'otto@inkwell.test');
  // the admin makes Eddie an editor
  await api('PATCH', `/api/users/${editor.user._id}`, { token: admin.token, body: { role: 'editor' } });
  catId = (await api('GET', '/api/categories', { token: author.token })).body.find((c) => c.slug === 'backend')._id;
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test('starter content is added once; the public site only shows published content', async () => {
  assert.strictEqual(await seedIfEmpty(), 0);
  const list = await api('GET', '/api/public/posts');
  assert.strictEqual(list.body.total, 6);
  assert.strictEqual(list.body.posts.length, 6);
  assert.strictEqual(list.body.posts[0].title, 'Five things I wish I knew when I started coding'); // newest first
  assert.strictEqual(list.body.posts[0].body, undefined); // the list doesn't send whole bodies
  assert.ok(list.body.posts[0].readingMinutes >= 1);
  const pages = await api('GET', '/api/public/pages');
  assert.deepStrictEqual(pages.body.map((p) => p.slug), ['about']);
  const about = await api('GET', '/api/public/posts/about');
  assert.strictEqual(about.body.post.author.name, 'Inkwell Team');
  assert.strictEqual(about.body.post.author.email, undefined);
});

test('public search, category and tag filters', async () => {
  assert.strictEqual((await api('GET', '/api/public/posts?search=coffee')).body.total, 1);
  assert.strictEqual((await api('GET', '/api/public/posts?search=' + encodeURIComponent('(*'))).status, 200);
  assert.strictEqual((await api('GET', '/api/public/posts?category=backend')).body.total, 2);
  assert.strictEqual((await api('GET', '/api/public/posts?category=nope')).body.total, 0);
  assert.strictEqual((await api('GET', '/api/public/posts?tag=CSS')).body.total, 1);
  const cats = await api('GET', '/api/public/categories');
  assert.deepStrictEqual(cats.body.find((c) => c.slug === 'web-basics').count, 2);
});

test('roles: only ADMIN_EMAIL is admin, new accounts are authors, the team account cannot log in', async () => {
  assert.strictEqual(admin.user.role, 'admin');
  assert.strictEqual(author.user.role, 'author');
  assert.strictEqual(author.user.passwordHash, undefined);
  const team = await api('POST', '/api/auth/login', { body: { email: 'team@inkwell.invalid', password: '!no-login' } });
  assert.strictEqual(team.status, 401);
  assert.strictEqual((await api('POST', '/api/auth/register', { body: { name: 'X', email: 'ADA@inkwell.test', password: 'password123' } })).status, 409);
  assert.strictEqual((await api('POST', '/api/auth/register', { body: { name: 'X', email: 'x@inkwell.test', password: 'short' } })).status, 400);
});

let draftId;

test('an author writes a draft that stays private, and cannot publish it', async () => {
  const created = await api('POST', '/api/posts', {
    token: author.token,
    body: { title: 'My First Post!', excerpt: 'Hello', body: 'Hello **world**', category: catId, tags: 'Intro, news, intro' },
  });
  assert.strictEqual(created.status, 201);
  assert.strictEqual(created.body.slug, 'my-first-post');
  assert.strictEqual(created.body.status, 'draft');
  assert.deepStrictEqual(created.body.tags, ['intro', 'news']);
  draftId = created.body._id;

  assert.strictEqual((await api('GET', '/api/public/posts/my-first-post')).status, 404);
  const publish = await api('PUT', `/api/posts/${draftId}`, { token: author.token, body: { status: 'published' } });
  assert.strictEqual(publish.status, 403);
  const page = await api('POST', '/api/posts', { token: author.token, body: { title: 'A page', type: 'page' } });
  assert.strictEqual(page.status, 403);

  // the same title again gets a different URL
  const twin = await api('POST', '/api/posts', { token: author.token, body: { title: 'My first post' } });
  assert.strictEqual(twin.body.slug, 'my-first-post-2');
  // a slug that is already used is refused
  const clash = await api('PUT', `/api/posts/${twin.body._id}`, { token: author.token, body: { slug: 'about' } });
  assert.strictEqual(clash.status, 409);
});

test('authors only see and change their own posts', async () => {
  const mine = await api('GET', '/api/posts', { token: author.token });
  assert.ok(mine.body.every((p) => p.author.name === 'Ada'));
  assert.strictEqual((await api('GET', `/api/posts/${draftId}`, { token: other.token })).status, 404);
  assert.strictEqual((await api('PUT', `/api/posts/${draftId}`, { token: other.token, body: { title: 'Hacked' } })).status, 404);
  assert.strictEqual((await api('DELETE', `/api/posts/${draftId}`, { token: other.token })).status, 404);
  const all = await api('GET', '/api/posts', { token: editor.token });
  assert.ok(all.body.length >= 9);
});

test('review -> an editor publishes -> it appears on the site; then the author is locked out', async () => {
  const review = await api('PUT', `/api/posts/${draftId}`, { token: author.token, body: { status: 'review' } });
  assert.strictEqual(review.body.status, 'review');
  assert.strictEqual(review.body.publishedAt, null);
  const reviewList = await api('GET', '/api/posts?status=review', { token: editor.token });
  assert.ok(reviewList.body.some((p) => p._id === draftId));

  const published = await api('PUT', `/api/posts/${draftId}`, { token: editor.token, body: { status: 'published' } });
  assert.ok(published.body.publishedAt);
  const pub = await api('GET', '/api/public/posts/my-first-post');
  assert.strictEqual(pub.status, 200);
  assert.strictEqual(pub.body.post.category.name, 'Backend');

  const late = await api('PUT', `/api/posts/${draftId}`, { token: author.token, body: { title: 'Changed' } });
  assert.strictEqual(late.status, 403);
  assert.strictEqual((await api('DELETE', `/api/posts/${draftId}`, { token: author.token })).status, 403);
});

test('every text change keeps a revision, and a revision can be restored', async () => {
  await api('PUT', `/api/posts/${draftId}`, { token: editor.token, body: { body: 'Version 2' } });
  await api('PUT', `/api/posts/${draftId}`, { token: editor.token, body: { body: 'Version 3' } });
  await api('PUT', `/api/posts/${draftId}`, { token: editor.token, body: { tags: ['only-tags'] } }); // no text change
  const revs = await api('GET', `/api/posts/${draftId}/revisions`, { token: editor.token });
  assert.deepStrictEqual(revs.body.map((r) => r.body), ['Version 2', 'Hello **world**']);
  assert.strictEqual(revs.body[0].editedBy.name, 'Eddie');

  const restored = await api('POST', `/api/posts/${draftId}/revisions/${revs.body[1]._id}/restore`, { token: editor.token });
  assert.strictEqual(restored.body.body, 'Hello **world**');
  const after = await api('GET', `/api/posts/${draftId}/revisions`, { token: editor.token });
  assert.strictEqual(after.body[0].body, 'Version 3'); // restoring can be undone
});

test('comments: visitors comment, they wait for approval, spam traps work', async () => {
  resetRateLimit();
  const sent = await api('POST', '/api/public/posts/my-first-post/comments', { body: { name: 'Visitor', body: 'Nice post!' } });
  assert.strictEqual(sent.status, 201);
  assert.strictEqual((await api('GET', '/api/public/posts/my-first-post')).body.comments.length, 0);

  // a bot fills the hidden "website" field: it looks accepted but is not saved
  await api('POST', '/api/public/posts/my-first-post/comments', { body: { name: 'Bot', body: 'Buy now', website: 'spam.example' } });
  assert.strictEqual((await api('POST', '/api/public/posts/my-first-post/comments', { body: { name: 'V', body: '' } })).status, 400);
  assert.strictEqual((await api('POST', '/api/public/posts/does-not-exist/comments', { body: { name: 'V', body: 'hi' } })).status, 404);

  assert.strictEqual((await api('GET', '/api/comments', { token: author.token })).status, 403);
  const pending = await api('GET', '/api/comments?status=pending', { token: editor.token });
  assert.deepStrictEqual(pending.body.map((c) => c.name), ['Visitor']);
  await api('PATCH', `/api/comments/${pending.body[0]._id}`, { token: editor.token, body: { status: 'approved' } });
  const shown = await api('GET', '/api/public/posts/my-first-post');
  assert.deepStrictEqual(shown.body.comments.map((c) => c.body), ['Nice post!']);

  // rate limit: 5 comments per 10 minutes per visitor
  resetRateLimit();
  const codes = [];
  for (let i = 0; i < 6; i++) codes.push((await api('POST', '/api/public/posts/about/comments', { body: { name: 'V', body: `c${i}` } })).status);
  assert.deepStrictEqual(codes, [201, 201, 201, 201, 201, 429]);
});

test('categories: editors manage them, a used category cannot be deleted', async () => {
  assert.strictEqual((await api('POST', '/api/categories', { token: author.token, body: { name: 'Nope' } })).status, 403);
  const made = await api('POST', '/api/categories', { token: editor.token, body: { name: 'Design & UX' } });
  assert.strictEqual(made.body.slug, 'design-ux');
  assert.strictEqual((await api('POST', '/api/categories', { token: editor.token, body: { name: 'Design & UX' } })).status, 409);
  assert.strictEqual((await api('DELETE', `/api/categories/${catId}`, { token: editor.token })).status, 409);
  assert.strictEqual((await api('DELETE', `/api/categories/${made.body._id}`, { token: editor.token })).status, 200);
});

test('users: only the admin manages them, and a switched-off account is locked out', async () => {
  assert.strictEqual((await api('GET', '/api/users', { token: editor.token })).status, 403);
  const users = await api('GET', '/api/users', { token: admin.token });
  assert.strictEqual(users.body.find((u) => u.email === 'ada@inkwell.test').posts, 2);
  assert.strictEqual((await api('PATCH', `/api/users/${admin.user._id}`, { token: admin.token, body: { role: 'author' } })).status, 400);
  assert.strictEqual((await api('PATCH', `/api/users/${other.user._id}`, { token: admin.token, body: { role: 'king' } })).status, 400);
  await api('PATCH', `/api/users/${other.user._id}`, { token: admin.token, body: { active: false } });
  assert.strictEqual((await api('GET', '/api/posts', { token: other.token })).status, 403);
  assert.strictEqual((await api('POST', '/api/auth/login', { body: { email: 'otto@inkwell.test', password: 'password123' } })).status, 403);
});

test('dashboard stats depend on the role; deleting a post removes its revisions and comments', async () => {
  const s = await api('GET', '/api/stats', { token: author.token });
  assert.deepStrictEqual(s.body.posts, { draft: 1, review: 0, published: 1 });
  assert.strictEqual(s.body.users, 0);
  const e = await api('GET', '/api/stats', { token: admin.token });
  assert.strictEqual(e.body.posts.published, 7);
  assert.ok(e.body.users >= 5);

  assert.strictEqual((await api('DELETE', `/api/posts/${draftId}`, { token: editor.token })).status, 200);
  assert.strictEqual(await mongoose.connection.collection('revisions').countDocuments({ post: new mongoose.Types.ObjectId(draftId) }), 0);
  assert.strictEqual(await mongoose.connection.collection('comments').countDocuments({ post: new mongoose.Types.ObjectId(draftId) }), 0);
});

test('bad input gets clear errors', async () => {
  assert.strictEqual((await api('GET', '/api/posts/123', { token: editor.token })).status, 400);
  assert.strictEqual((await api('POST', '/api/posts', { token: editor.token, body: { title: '' } })).status, 400);
  assert.strictEqual((await api('POST', '/api/posts', { token: editor.token, body: { title: 'x', cover: 'javascript:alert(1)' } })).status, 400);
  assert.strictEqual((await api('POST', '/api/posts', { token: editor.token, body: { title: 'x', status: 'banana' } })).status, 400);
  assert.strictEqual((await api('GET', '/api/nope')).status, 404);
  assert.strictEqual((await api('GET', '/api/posts')).status, 401);
});
