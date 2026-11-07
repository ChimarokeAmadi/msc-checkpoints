// Tests the four routes against a real (temporary, in-memory) MongoDB,
// sending real HTTP requests just like Postman does.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('../server');
const User = require('../models/User');

let mongod, server, base;
const api = async (method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body && JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('users_test'));
  await User.init(); // make sure the unique email index exists
  server = app.listen(0);
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

let ada;

test('GET /users returns an empty list at first', async () => {
  const r = await api('GET', '/users');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body, []);
});

test('POST /users creates a user (and cleans the email)', async () => {
  const r = await api('POST', '/users', { name: '  Ada Lovelace ', email: 'ADA@Example.com', age: 36 });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.name, 'Ada Lovelace');
  assert.strictEqual(r.body.email, 'ada@example.com');
  assert.ok(r.body._id && r.body.createdAt);
  ada = r.body;
  assert.ok(await User.findById(ada._id), 'saved in MongoDB');
});

test('POST /users rejects invalid data with 400', async () => {
  const r = await api('POST', '/users', { email: 'not-an-email', age: -1 });
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.body.errors.length, 3); // name missing, bad email, negative age
});

test('POST /users rejects a duplicate email with 409', async () => {
  const r = await api('POST', '/users', { name: 'Copy', email: 'ada@example.com' });
  assert.strictEqual(r.status, 409);
});

test('GET /users returns all users', async () => {
  await api('POST', '/users', { name: 'Alan Turing', email: 'alan@example.com', age: 41 });
  const r = await api('GET', '/users');
  assert.strictEqual(r.status, 200);
  assert.deepStrictEqual(r.body.map((u) => u.name), ['Ada Lovelace', 'Alan Turing']);
});

test('PUT /users/:id edits only the fields sent and returns the new version', async () => {
  const r = await api('PUT', `/users/${ada._id}`, { age: 37 });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.age, 37);
  assert.strictEqual(r.body.name, 'Ada Lovelace');
  assert.strictEqual((await User.findById(ada._id)).age, 37);
});

test('PUT /users/:id runs the schema validators', async () => {
  const r = await api('PUT', `/users/${ada._id}`, { age: -5 });
  assert.strictEqual(r.status, 400);
});

test('PUT and DELETE answer 400 for a bad id and 404 for an unknown one', async () => {
  assert.strictEqual((await api('PUT', '/users/123', { age: 1 })).status, 400);
  assert.strictEqual((await api('DELETE', '/users/123')).status, 400);
  const unknown = new mongoose.Types.ObjectId().toString();
  assert.strictEqual((await api('PUT', `/users/${unknown}`, { age: 1 })).status, 404);
  assert.strictEqual((await api('DELETE', `/users/${unknown}`)).status, 404);
});

test('DELETE /users/:id removes the user', async () => {
  const r = await api('DELETE', `/users/${ada._id}`);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.user.email, 'ada@example.com');
  assert.strictEqual(await User.findById(ada._id), null);
  const all = await api('GET', '/users');
  assert.deepStrictEqual(all.body.map((u) => u.name), ['Alan Turing']);
});
