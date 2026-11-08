// Tests a running copy of the app (for example the Azure one) from the outside:
//   node scripts/check-deployment.js https://<your-app>.azurewebsites.net
// It checks the page, the database connection, then adds, edits and deletes a
// test user, so it leaves the database as it found it.
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');

async function call(method, path, body) {
  const res = await fetch(base + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return { status: res.status, data };
}

function check(ok, message) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${message}`);
  if (!ok) process.exitCode = 1;
  return ok;
}

(async () => {
  console.log(`Checking ${base}\n`);
  const page = await call('GET', '/');
  check(page.status === 200 && String(page.data).includes('<div id="root">'), 'the React page loads');

  const health = await call('GET', '/api/health');
  if (!check(health.data.database === 'connected', `database is connected (got: ${health.data.database ?? health.status})`)) {
    console.log('\nCheck MONGO_URI in the Environment variables and the Atlas Network Access list.');
    return;
  }

  const email = `check.${Date.now()}@example.com`;
  const created = await call('POST', '/api/users', { name: 'Deployment Check', email, age: 1 });
  check(created.status === 201, 'POST /api/users adds a user');
  const id = created.data._id;

  const list = await call('GET', '/api/users');
  check(list.status === 200 && list.data.some((u) => u._id === id), 'GET /api/users returns it');

  const edited = await call('PUT', `/api/users/${id}`, { age: 2 });
  check(edited.status === 200 && edited.data.age === 2, 'PUT /api/users/:id edits it');

  const removed = await call('DELETE', `/api/users/${id}`);
  check(removed.status === 200, 'DELETE /api/users/:id removes it');
  const gone = await call('DELETE', `/api/users/${id}`);
  check(gone.status === 404, 'it is really gone (second delete = 404)');

  console.log(process.exitCode ? '\nSome checks failed.' : '\nAll checks passed.');
})().catch((err) => {
  console.error(`FAIL  could not reach ${base}: ${err.message}`);
  process.exitCode = 1;
});
