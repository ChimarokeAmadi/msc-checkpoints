// End-to-end tests with Node's test runner + supertest + an in-memory MongoDB.
// Run with: npm test

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-only-for-tests';
process.env.MONGO_URI = '';
process.env.GOOGLE_CLIENT_ID = 'fake-client-id.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'fake-secret';

const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createApp } = require('../src/app');
const { passport } = require('../src/config/passport');
const User = require('../src/models/User');
const Task = require('../src/models/Task');

let mongo;
let app;

before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri('test'));
  await User.init(); // build the unique indexes
});

after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await User.deleteMany({});
  await Task.deleteMany({});
  app = createApp({ authMax: 1000, apiMax: 1000 }); // no rate limiting in most tests
});

// Signs up a user and returns the cookie to use in the next requests
async function signup(name = 'Ada', email = 'ada@example.com', password = 'supersecret1') {
  const res = await request(app).post('/auth/signup').send({ name, email, password });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.headers['set-cookie'][0].split(';')[0];
}

// ---------- Authentication ----------

test('signup stores the JWT in an HTTP-only, secure cookie (not in the body)', async () => {
  const res = await request(app)
    .post('/auth/signup')
    .send({ name: 'Ada', email: 'ADA@example.com', password: 'supersecret1' });

  assert.equal(res.status, 201);
  assert.equal(res.body.data.user.email, 'ada@example.com');
  assert.equal(res.body.data.user.password, undefined);
  assert.equal(res.body.token, undefined);

  const cookie = res.headers['set-cookie'][0];
  assert.match(cookie, /^jwt=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);

  const saved = await User.findOne({ email: 'ada@example.com' }).select('+password');
  assert.notEqual(saved.password, 'supersecret1'); // hashed
  assert.match(saved.password, /^\$2[aby]\$12\$/);
});

test('signup validation and duplicate emails', async () => {
  let res = await request(app).post('/auth/signup').send({ email: 'a@b.co', password: 'supersecret1' });
  assert.equal(res.status, 400);

  res = await request(app).post('/auth/signup').send({ name: 'A', email: 'a@b.co', password: 'short' });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /8 characters/);

  res = await request(app).post('/auth/signup').send({ name: 'A', email: 'not-an-email', password: 'supersecret1' });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /valid email/);

  await signup();
  res = await request(app).post('/auth/signup').send({ name: 'Ada 2', email: 'ada@example.com', password: 'supersecret1' });
  assert.equal(res.status, 409);
  assert.deepEqual(res.body, { status: 'fail', message: 'This email is already in use.' });
});

test('login: right password gives a cookie, wrong password gives the same vague error', async () => {
  await signup();

  const ok = await request(app).post('/auth/login').send({ email: 'ada@example.com', password: 'supersecret1' });
  assert.equal(ok.status, 200);
  assert.match(ok.headers['set-cookie'][0], /^jwt=.+HttpOnly/);

  const wrongPassword = await request(app).post('/auth/login').send({ email: 'ada@example.com', password: 'nope-nope-nope' });
  const noUser = await request(app).post('/auth/login').send({ email: 'ghost@example.com', password: 'supersecret1' });
  assert.equal(wrongPassword.status, 401);
  assert.equal(noUser.status, 401);
  assert.equal(wrongPassword.body.message, noUser.body.message);
});

test('verifyToken protects private routes', async () => {
  let res = await request(app).get('/tasks');
  assert.equal(res.status, 401);
  assert.match(res.body.message, /not logged in/);

  res = await request(app).get('/tasks').set('Cookie', 'jwt=this.is.garbage');
  assert.equal(res.status, 401);
  assert.match(res.body.message, /Invalid token/);

  const expired = jwt.sign({ id: new mongoose.Types.ObjectId().toString() }, process.env.JWT_SECRET, { expiresIn: -10 });
  res = await request(app).get('/tasks').set('Cookie', `jwt=${expired}`);
  assert.equal(res.status, 401);
  assert.match(res.body.message, /expired/);

  const forged = jwt.sign({ id: 'x' }, 'someone-elses-secret');
  res = await request(app).get('/tasks').set('Cookie', `jwt=${forged}`);
  assert.equal(res.status, 401);

  const cookie = await signup();
  res = await request(app).get('/auth/me').set('Cookie', cookie);
  assert.equal(res.status, 200);
  assert.equal(res.body.data.user.name, 'Ada');

  // Bearer header also works (handy for Postman)
  res = await request(app).get('/tasks').set('Authorization', `Bearer ${cookie.slice(4)}`);
  assert.equal(res.status, 200);
});

test('a token for a deleted user is rejected', async () => {
  const cookie = await signup();
  await User.deleteMany({});
  const res = await request(app).get('/tasks').set('Cookie', cookie);
  assert.equal(res.status, 401);
  assert.match(res.body.message, /no longer exists/);
});

test('logout clears the cookie', async () => {
  const res = await request(app).post('/auth/logout');
  assert.equal(res.status, 200);
  assert.match(res.headers['set-cookie'][0], /^jwt=;.*Expires=Thu, 01 Jan 1970/);
});

// ---------- Tasks ----------

test('create, list, get and delete my own tasks', async () => {
  const cookie = await signup();

  const created = await request(app).post('/tasks').set('Cookie', cookie).send({ title: 'Buy milk', description: 'Two litres' });
  assert.equal(created.status, 201);
  const task = created.body.data.task;
  assert.equal(task.title, 'Buy milk');
  assert.equal(task.completed, false);

  await request(app).post('/tasks').set('Cookie', cookie).send({ title: 'Study Node' });

  const list = await request(app).get('/tasks').set('Cookie', cookie);
  assert.equal(list.status, 200);
  assert.equal(list.body.results, 2);
  assert.equal(list.body.data.tasks[0].title, 'Study Node'); // newest first

  const one = await request(app).get(`/tasks/${task.id}`).set('Cookie', cookie);
  assert.equal(one.status, 200);

  const del = await request(app).delete(`/tasks/${task.id}`).set('Cookie', cookie);
  assert.equal(del.status, 204);

  const gone = await request(app).delete(`/tasks/${task.id}`).set('Cookie', cookie);
  assert.equal(gone.status, 404);
});

test('task validation', async () => {
  const cookie = await signup();
  let res = await request(app).post('/tasks').set('Cookie', cookie).send({});
  assert.equal(res.status, 400);
  res = await request(app).post('/tasks').set('Cookie', cookie).send({ title: 'x'.repeat(101) });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /at most 100/);
  res = await request(app).get('/tasks/123').set('Cookie', cookie);
  assert.equal(res.status, 400);
  assert.match(res.body.message, /Invalid task id/);
});

test('only the owner can see or delete a task', async () => {
  const ada = await signup('Ada', 'ada@example.com');
  const bob = await signup('Bob', 'bob@example.com');

  const res = await request(app).post('/tasks').set('Cookie', ada).send({ title: "Ada's secret plan" });
  const id = res.body.data.task.id;

  // Bob doesn't see Ada's task in his list
  const bobList = await request(app).get('/tasks').set('Cookie', bob);
  assert.equal(bobList.body.results, 0);

  // Bob can't read or delete it
  const bobGet = await request(app).get(`/tasks/${id}`).set('Cookie', bob);
  assert.equal(bobGet.status, 403);
  const bobDelete = await request(app).delete(`/tasks/${id}`).set('Cookie', bob);
  assert.equal(bobDelete.status, 403);
  assert.ok(await Task.findById(id), 'the task must still exist');
});

test('the owner always comes from the token, not the request body', async () => {
  const ada = await signup('Ada', 'ada@example.com');
  const bob = await signup('Bob', 'bob@example.com');
  const adaId = (await User.findOne({ email: 'ada@example.com' }))._id;

  const res = await request(app).post('/tasks').set('Cookie', bob).send({ title: 'Sneaky', owner: adaId });
  assert.equal(res.status, 201);
  const adaList = await request(app).get('/tasks').set('Cookie', ada);
  assert.equal(adaList.body.results, 0);
});

// ---------- Security ----------

test('helmet sets security headers and X-Powered-By is hidden', async () => {
  const res = await request(app).get('/');
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.ok(res.headers['content-security-policy']);
  assert.ok(res.headers['strict-transport-security']);
  assert.equal(res.headers['x-powered-by'], undefined);
});

// Two layers stop this: express-mongo-sanitize strips the "$ne" keys, and the
// controller only accepts strings for email and password.
test('NoSQL injection on login is blocked', async () => {
  await signup();
  // Without sanitizing, { "$ne": null } would match ANY email
  const res = await request(app)
    .post('/auth/login')
    .send({ email: { $ne: null }, password: { $ne: null } });
  assert.equal(res.status, 400);
  assert.equal(res.headers['set-cookie'], undefined);
});

test('xss-clean escapes HTML in task titles', async () => {
  const cookie = await signup();
  const res = await request(app)
    .post('/tasks')
    .set('Cookie', cookie)
    .send({ title: '<script>alert("hacked")</script>Clean room' });
  assert.equal(res.status, 201);
  assert.doesNotMatch(res.body.data.task.title, /<script>/);
  assert.match(res.body.data.task.title, /&lt;script>/);
});

test('rate limiting: 5 failed logins, then 429', async () => {
  app = createApp({ authMax: 5, apiMax: 1000 });
  await User.create({ name: 'Ada', email: 'ada@example.com', password: 'supersecret1' });

  for (let i = 0; i < 5; i++) {
    const res = await request(app).post('/auth/login').send({ email: 'ada@example.com', password: 'wrong-guess' });
    assert.equal(res.status, 401);
  }
  const blocked = await request(app).post('/auth/login').send({ email: 'ada@example.com', password: 'supersecret1' });
  assert.equal(blocked.status, 429);
  assert.deepEqual(blocked.body, {
    status: 'fail',
    message: 'Too many login attempts from this IP. Please try again in 15 minutes.',
  });
  assert.ok(blocked.headers.ratelimit || blocked.headers['ratelimit-policy']);
});

test('request bodies over 10kb are refused', async () => {
  const res = await request(app).post('/auth/signup').send({ name: 'x'.repeat(20000) });
  assert.equal(res.status, 413);
});

// ---------- Error handling ----------

test('errors always have the same JSON shape', async () => {
  const notFound = await request(app).get('/nope');
  assert.equal(notFound.status, 404);
  assert.deepEqual(notFound.body, { status: 'fail', message: "Can't find GET /nope on this server." });

  const badJson = await request(app).post('/auth/login').set('Content-Type', 'application/json').send('{"email": ');
  assert.equal(badJson.status, 400);
  assert.equal(badJson.body.message, 'The request body is not valid JSON.');
});

test('unexpected bugs return a generic 500 without leaking details', async () => {
  const cookie = await signup();
  const original = Task.find;
  Task.find = () => { throw new Error('database password is hunter2'); };
  const originalError = console.error;
  console.error = () => {}; // keep the test output clean
  try {
    const res = await request(app).get('/tasks').set('Cookie', cookie);
    assert.equal(res.status, 500);
    assert.deepEqual(res.body, { status: 'error', message: 'Something went wrong. Please try again later.' });
  } finally {
    Task.find = original;
    console.error = originalError;
  }
});

// ---------- Google OAuth ----------

test('GET /auth/google redirects to Google with the right scopes', async () => {
  const res = await request(app).get('/auth/google');
  assert.equal(res.status, 302);
  const url = new URL(res.headers.location);
  assert.equal(url.hostname, 'accounts.google.com');
  assert.equal(url.searchParams.get('client_id'), process.env.GOOGLE_CLIENT_ID);
  assert.equal(url.searchParams.get('scope'), 'profile email');
  assert.equal(url.searchParams.get('redirect_uri'), 'http://localhost:3000/auth/google/callback');
});

test('Google strategy: creates a new user, then links to an existing email account', async () => {
  const verify = passport._strategy('google')._verify;
  const run = (profile) =>
    new Promise((resolve, reject) => verify('access', 'refresh', profile, (err, user, info) => (err ? reject(err) : resolve({ user, info }))));

  // New user
  const { user: newUser } = await run({
    id: 'google-111', displayName: 'Grace Hopper', emails: [{ value: 'grace@gmail.com', verified: true }],
  });
  assert.equal(newUser.name, 'Grace Hopper');
  assert.equal(newUser.googleId, 'google-111');

  // Same Google account again: same user, no duplicate
  const { user: again } = await run({ id: 'google-111', displayName: 'Grace', emails: [{ value: 'grace@gmail.com' }] });
  assert.ok(again._id.equals(newUser._id));

  // Existing email+password account gets linked
  await signup('Ada', 'ada@example.com');
  const { user: linked } = await run({ id: 'google-222', displayName: 'Ada L', emails: [{ value: 'Ada@Example.com', verified: true }] });
  assert.equal(linked.name, 'Ada');
  assert.equal(linked.googleId, 'google-222');
  assert.equal(await User.countDocuments(), 2);

  // A Google-only user can't log in with a password
  const res = await request(app).post('/auth/login').send({ email: 'grace@gmail.com', password: 'anything123' });
  assert.equal(res.status, 401);

  // No verified email: refused
  const { user: none } = await run({ id: 'google-333', displayName: 'X', emails: [{ value: 'x@gmail.com', verified: false }] });
  assert.equal(none, false);
});
