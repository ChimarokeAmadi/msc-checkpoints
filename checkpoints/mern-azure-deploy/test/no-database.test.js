// Runs in its own process with NO database: the app must still answer, and
// say clearly that the database is missing (useful when checking Azure).
const { test, after } = require('node:test');
const assert = require('node:assert');
const { app } = require('../server');

const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}`;
after(() => server.close());

test('without a database, /api/health says disconnected and /api/users answers 503 quickly', async () => {
  assert.strictEqual((await (await fetch(base + '/api/health')).json()).database, 'disconnected');
  const t0 = Date.now();
  const res = await fetch(base + '/api/users');
  assert.strictEqual(res.status, 503);
  assert.ok(Date.now() - t0 < 1000);
});
