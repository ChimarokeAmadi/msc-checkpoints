// Tests the API and the React serving against a temporary in-memory MongoDB,
// with real HTTP requests (the same thing the browser does).
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');
const User = require('../models/User');

let mongod, server, base;
const api = async (method, path, body) => {
  const res = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json' }, body: body && JSON.stringify(body) });
  return { status: res.status, body: await res.json() };
};

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('mern_test'));
  await User.init();
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

let ada;

test('GET /api/health reports the database as connected', async () => {
  assert.deepStrictEqual((await api('GET', '/api/health')).body, { status: 'ok', database: 'connected' });
});

test('POST /api/users creates a user', async () => {
  const r = await api('POST', '/api/users', { name: 'Ada Lovelace', email: 'Ada@Example.com', age: 36 });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.email, 'ada@example.com');
  ada = r.body;
});

test('POST /api/users: 400 for invalid data, 409 for a duplicate email', async () => {
  assert.strictEqual((await api('POST', '/api/users', { email: 'nope' })).status, 400);
  assert.strictEqual((await api('POST', '/api/users', { name: 'Copy', email: 'ada@example.com' })).status, 409);
});

test('GET /api/users returns all users', async () => {
  await api('POST', '/api/users', { name: 'Alan Turing', email: 'alan@example.com' });
  const r = await api('GET', '/api/users');
  assert.deepStrictEqual(r.body.map((u) => u.name), ['Ada Lovelace', 'Alan Turing']);
});

test('PUT /api/users/:id edits a user (with validation)', async () => {
  const r = await api('PUT', `/api/users/${ada._id}`, { age: 37 });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.age, 37);
  assert.strictEqual((await api('PUT', `/api/users/${ada._id}`, { age: -1 })).status, 400);
  assert.strictEqual((await api('PUT', '/api/users/123', { age: 1 })).status, 400);
});

test('DELETE /api/users/:id removes a user', async () => {
  assert.strictEqual((await api('DELETE', `/api/users/${ada._id}`)).status, 200);
  assert.strictEqual(await User.findById(ada._id), null);
  assert.strictEqual((await api('DELETE', `/api/users/${ada._id}`)).status, 404);
});

test('unknown /api URLs get a JSON 404', async () => {
  const r = await api('GET', '/api/nothing');
  assert.strictEqual(r.status, 404);
});

test('the built React app is served, and any page URL falls back to index.html', async () => {
  for (const path of ['/', '/some/react/page']) {
    const res = await fetch(base + path);
    assert.strictEqual(res.status, 200);
    assert.match(await res.text(), /<div id="root"><\/div>/);
  }
  const html = await (await fetch(base + '/')).text();
  const js = html.match(/src="(\/assets\/[^"]+\.js)"/)[1];
  const res = await fetch(base + js);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type'), /javascript/);
});
