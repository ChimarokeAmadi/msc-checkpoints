// Tests every route against a real server on a random port.
// Run with: npm test

import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createApp } from '../src/app.js';

let server;
let baseUrl;

// A fresh app (and empty array) before each test, so tests don't affect each other
beforeEach(() => {
  server.removeAllListeners('request');
  server.on('request', createApp({ logger: { log() {}, error() {} } }));
});

before(async () => {
  server = http.createServer();
  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://localhost:${server.address().port}`;
});

after(() => new Promise((resolve) => server.close(resolve)));

async function request(method, path, body, headers = {}) {
  const options = { method, headers: { ...headers } };
  if (body !== undefined) {
    options.body = typeof body === 'string' ? body : JSON.stringify(body);
    options.headers['Content-Type'] ??= 'application/json';
  }
  const res = await fetch(baseUrl + path, options);
  const text = await res.text();
  return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

const createTodo = (title, completed) => request('POST', '/todos', completed === undefined ? { title } : { title, completed });

// ---------- Create ----------
test('POST /todos creates a task with completed=false by default', async () => {
  const res = await createTodo('Buy milk');
  assert.equal(res.status, 201);
  assert.equal(res.headers.get('location'), '/todos/1');
  assert.equal(res.headers.get('content-type'), 'application/json; charset=utf-8');
  assert.deepEqual({ id: res.body.id, title: res.body.title, completed: res.body.completed }, { id: 1, title: 'Buy milk', completed: false });
});

test('POST /todos accepts completed and trims the title', async () => {
  const res = await createTodo('   Read a book  ', true);
  assert.equal(res.status, 201);
  assert.equal(res.body.title, 'Read a book');
  assert.equal(res.body.completed, true);
});

test('ids are unique and never reused after a delete', async () => {
  await createTodo('A');
  const b = await createTodo('B');
  await request('DELETE', `/todos/${b.body.id}`);
  const c = await createTodo('C');
  assert.equal(c.body.id, 3);
});

// ---------- Validation ----------
test('POST /todos rejects invalid data with 400 and lists every problem', async () => {
  const cases = [
    [{}, /"title" is required/],
    [{ title: '' }, /"title" is required/],
    [{ title: 42 }, /"title" is required/],
    [{ title: 'x'.repeat(201) }, /at most 200 characters/],
    [{ title: 'ok', completed: 'yes' }, /"completed" must be true or false/],
    [{ title: 'ok', priority: 'high' }, /unknown field\(s\): priority/],
    [[{ title: 'array' }], /must be a JSON object/],
  ];
  for (const [body, expected] of cases) {
    const res = await request('POST', '/todos', body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.match(res.body.error.details.join(' | '), expected);
  }
  const both = await request('POST', '/todos', { completed: 'no' });
  assert.equal(both.body.error.details.length, 2);
});

test('invalid JSON -> 400, empty body -> 400, wrong content type -> 415, too large -> 413', async () => {
  assert.equal((await request('POST', '/todos', '{"title": "oops"')).status, 400);
  assert.equal((await request('POST', '/todos', '')).status, 400);
  const text = await request('POST', '/todos', 'title=Buy milk', { 'Content-Type': 'text/plain' });
  assert.equal(text.status, 415);
  const big = await request('POST', '/todos', { title: 'x'.repeat(20000) });
  assert.equal(big.status, 413);
});

// ---------- Read ----------
test('GET /todos lists tasks and can filter by completed', async () => {
  await createTodo('One');
  await createTodo('Two', true);
  await createTodo('Three', true);

  const all = await request('GET', '/todos');
  assert.equal(all.status, 200);
  assert.equal(all.body.count, 3);

  const done = await request('GET', '/todos?completed=true');
  assert.deepEqual(done.body.todos.map((t) => t.title), ['Two', 'Three']);
  const notDone = await request('GET', '/todos?completed=false');
  assert.deepEqual(notDone.body.todos.map((t) => t.title), ['One']);

  assert.equal((await request('GET', '/todos?completed=maybe')).status, 400);
});

test('GET /todos on an empty list returns an empty array', async () => {
  const res = await request('GET', '/todos');
  assert.deepEqual(res.body, { count: 0, todos: [] });
});

test('GET /todos/:id returns one task, 404 if missing, 400 if the id is invalid', async () => {
  await createTodo('Find me');
  assert.equal((await request('GET', '/todos/1')).body.title, 'Find me');
  assert.equal((await request('GET', '/todos/1/')).status, 200); // trailing slash is fine
  assert.equal((await request('GET', '/todos/99')).status, 404);
  for (const bad of ['abc', '0', '-1', '1.5']) {
    assert.equal((await request('GET', `/todos/${bad}`)).status, 400, bad);
  }
});

// ---------- Update ----------
test('PUT /todos/:id replaces the task (completed goes back to false if not sent)', async () => {
  await createTodo('Old title', true);
  const res = await request('PUT', '/todos/1', { title: 'New title' });
  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'New title');
  assert.equal(res.body.completed, false);
  assert.ok(res.body.updatedAt);
  assert.equal((await request('PUT', '/todos/1', { completed: true })).status, 400); // title is required
  assert.equal((await request('PUT', '/todos/7', { title: 'x' })).status, 404);
});

test('PATCH /todos/:id changes only the fields sent', async () => {
  await createTodo('Keep this title');
  const res = await request('PATCH', '/todos/1', { completed: true });
  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'Keep this title');
  assert.equal(res.body.completed, true);

  const renamed = await request('PATCH', '/todos/1', { title: 'Renamed' });
  assert.equal(renamed.body.completed, true);

  assert.equal((await request('PATCH', '/todos/1', {})).status, 400);
  assert.equal((await request('PATCH', '/todos/1', { completed: 1 })).status, 400);
  assert.equal((await request('PATCH', '/todos/50', { completed: true })).status, 404);
});

// ---------- Delete ----------
test('DELETE /todos/:id removes the task with 204, then 404', async () => {
  await createTodo('Delete me');
  const res = await request('DELETE', '/todos/1');
  assert.equal(res.status, 204);
  assert.equal(res.body, null);
  assert.equal((await request('GET', '/todos/1')).status, 404);
  assert.equal((await request('DELETE', '/todos/1')).status, 404);
});

// ---------- Routing ----------
test('unknown routes give 404 and unsupported methods give 405 with an Allow header', async () => {
  assert.equal((await request('GET', '/tasks')).status, 404);
  assert.equal((await request('GET', '/todos/1/comments')).status, 404);

  const del = await request('DELETE', '/todos');
  assert.equal(del.status, 405);
  assert.equal(del.headers.get('allow'), 'GET, POST');

  const post = await request('POST', '/todos/1', { title: 'x' });
  assert.equal(post.status, 405);
  assert.equal(post.headers.get('allow'), 'GET, PUT, PATCH, DELETE');
});

test('GET / describes the API', async () => {
  const res = await request('GET', '/');
  assert.equal(res.status, 200);
  assert.ok(res.body.endpoints.includes('POST /todos'));
});
