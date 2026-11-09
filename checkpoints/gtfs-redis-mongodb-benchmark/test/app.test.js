// The trip-planner API on the handmade feed (test/fixture), on BOTH databases:
// the answers must be the known correct ones and identical.
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadFeed } = require('../src/gtfs');
const { RedisStore } = require('../src/redis-store');
const { MongoStore } = require('../src/mongo-store');
const { startRedis, startMongo } = require('../src/servers');
const { createApp } = require('../app/server');
const { changeTime } = require('../app/planner');

const apps = {};
const servers = [];
const stores = [];

before(async () => {
  const feed = await loadFeed(path.join(__dirname, 'fixture'));
  const r = await startRedis();
  const m = await startMongo();
  servers.push(r, m);
  for (const store of [await new RedisStore(r.url).connect(), await new MongoStore(m.uri).connect()]) {
    stores.push(store);
    await store.ingest(feed);
    const { app } = await createApp(store, feed);
    const http = app.listen(0);
    servers.push({ stop: () => http.close() });
    apps[store.name] = `http://127.0.0.1:${http.address().port}`;
  }
});
after(async () => {
  for (const s of stores) await s.close();
  for (const s of servers) await s.stop();
});

const get = async (db, url) => {
  const res = await fetch(apps[db] + url);
  const body = await res.json();
  delete body.ms; // timings differ, answers must not
  return { status: res.status, body };
};

test('changing bus takes at least 2 minutes, more if you walk', () => {
  assert.strictEqual(changeTime(0), 120);
  assert.strictEqual(changeTime(240), 260); // 200 s walking + 60 s to cross
});

for (const db of ['Redis', 'MongoDB']) {
  test(`${db}: info, search and departure board`, async () => {
    const info = await get(db, '/api/info');
    assert.strictEqual(info.body.database, db);
    assert.strictEqual(info.body.counts.stops, 5);
    assert.deepStrictEqual((await get(db, '/api/stops/search?q=gam')).body.stops, [{ stop_id: 'C', name: 'Gamma Park' }]);
    const board = await get(db, '/api/departures/A?date=2026-11-10&time=08:00');
    assert.deepStrictEqual(board.body.departures.map((d) => `${d.time} ${d.route.name}`), ['08:00 1', '08:02 L', '08:06 L', '08:30 1', '25:10 1']);
  });

  test(`${db}: a plan lists direct buses, and never a pointless walk to the same bus`, async () => {
    const plan = await get(db, '/api/plan?from=A&to=D&date=2026-11-10&time=07:55');
    assert.deepStrictEqual(plan.body.journeys.map((j) => `${j.depart}-${j.arrive} ${j.transfers}`), ['08:00-08:20 0', '08:30-08:50 0']);
  });

  test(`${db}: bad input gets clear errors`, async () => {
    assert.strictEqual((await get(db, '/api/plan?from=A&to=A&date=2026-11-10&time=08:00')).status, 400);
    assert.strictEqual((await get(db, '/api/plan?from=A&to=nope&date=2026-11-10&time=08:00')).status, 404);
    assert.strictEqual((await get(db, '/api/departures/A?date=10/11/2026')).status, 400);
    assert.strictEqual((await get(db, '/api/stops/near?lat=x')).status, 400);
  });
}

test('both databases give the same answers', async () => {
  for (const url of ['/api/plan?from=A&to=C&date=2026-11-10&time=07:55', '/api/departures/A?date=2026-11-11&time=00:00']) {
    assert.deepStrictEqual((await get('Redis', url)).body, (await get('MongoDB', url)).body);
  }
  // Distances differ by a few centimetres (Redis stores positions as geohashes
  // and uses a slightly different Earth radius), so compare them within 1 m
  const [r, m] = [(await get('Redis', '/api/stops/near?lat=45.5&lon=-122.6&radius=300')).body.stops, (await get('MongoDB', '/api/stops/near?lat=45.5&lon=-122.6&radius=300')).body.stops];
  assert.deepStrictEqual(r.map((s) => s.stop_id), m.map((s) => s.stop_id));
  r.forEach((s, i) => assert.ok(Math.abs(s.distance - m[i].distance) < 1));
});
