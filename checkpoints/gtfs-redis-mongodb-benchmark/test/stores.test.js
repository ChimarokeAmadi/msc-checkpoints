// Both stores must give the KNOWN correct answers on a tiny handmade feed
// (test/fixture) that contains the tricky GTFS cases:
//   - a Sunday-only trip and a holiday-only trip (service calendar)
//   - a holiday that removes the weekday service (calendar_dates exception)
//   - a loop route that passes stop A twice
//   - a trip after midnight (25:10:00)
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { loadFeed, activeServices, toSeconds } = require('../src/gtfs');
const { RedisStore } = require('../src/redis-store');
const { MongoStore } = require('../src/mongo-store');
const { startRedis, startMongo } = require('../src/servers');

const T = (hms) => toSeconds(hms);
let feed, servers, stores;

before(async () => {
  feed = await loadFeed(path.join(__dirname, 'fixture'));
  servers = [await startRedis(), await startMongo()];
  stores = [await new RedisStore(servers[0].url).connect(), await new MongoStore(servers[1].uri).connect()];
  for (const s of stores) await s.ingest(feed);
});
after(async () => {
  for (const s of stores) await s.close();
  for (const s of servers) await s.stop();
});

test('GTFS times after midnight become more than 24 hours of seconds', () => {
  assert.strictEqual(toSeconds('25:10:00'), 25 * 3600 + 600);
});

test('service calendar: weekday on a Tuesday, holiday rules on Wednesday 11 Nov', () => {
  assert.deepStrictEqual([...activeServices(feed, '20261110')], ['WEEKDAY']);
  assert.deepStrictEqual([...activeServices(feed, '20261111')], ['HOLIDAY']); // WEEKDAY removed, HOLIDAY added
  assert.deepStrictEqual([...activeServices(feed, '20261115')], ['SUNDAY']);
});

for (const [i, name] of [[0, 'Redis'], [1, 'MongoDB']]) {
  test(`${name}: next departures from A skip services that don't run that day`, async () => {
    const tue = await stores[i].departures('A', T('08:00:00'), activeServices(feed, '20261110'), 10);
    assert.deepStrictEqual(tue.map((d) => [d.trip_id, d.dep]), [
      ['T1', T('08:00:00')],
      ['LOOP1', T('08:02:00')],
      ['LOOP1', T('08:06:00')],
      ['T2', T('08:30:00')],
      ['NIGHT', T('25:10:00')],
    ]);
    const holiday = await stores[i].departures('A', T('08:00:00'), activeServices(feed, '20261111'), 10);
    assert.deepStrictEqual(holiday.map((d) => d.trip_id), ['EXTRA']);
  });

  test(`${name}: direct trips board a loop route at its LAST visit to A`, async () => {
    const services = activeServices(feed, '20261110');
    const toC = await stores[i].directTrips('A', 'C', T('07:55:00'), services);
    assert.deepStrictEqual(toC.map((j) => [j.trip_id, j.dep, j.arr]), [
      ['T1', T('08:00:00'), T('08:10:00')],
      ['LOOP1', T('08:06:00'), T('08:12:00')], // boards at 08:06, not 08:02
      ['T2', T('08:30:00'), T('08:40:00')],
    ]);
    // B comes BEFORE the second visit to A, so only the first visit works
    const toB = await stores[i].directTrips('A', 'B', T('07:55:00'), services);
    assert.deepStrictEqual(toB.map((j) => [j.trip_id, j.dep, j.arr]), [
      ['LOOP1', T('08:02:00'), T('08:04:00')],
      ['T1', T('08:00:00'), T('08:05:00')],
      ['T2', T('08:30:00'), T('08:35:00')],
    ]);
    assert.deepStrictEqual(await stores[i].directTrips('D', 'A', T('07:00:00'), services), []); // wrong direction
  });

  test(`${name}: nearby stops are sorted by distance and limited by the radius`, async () => {
    const near = await stores[i].nearbyStops(45.5, -122.6, 200, 10);
    assert.deepStrictEqual(near.map((s) => s.stop_id), ['A', 'B']); // C is ~222 m away
    assert.ok(Math.abs(near[1].distance - 111.2) < 1);
    assert.strictEqual(near[1].name, 'Beta Street');
  });

  test(`${name}: stop search matches the start of any word in the name`, async () => {
    assert.deepStrictEqual((await stores[i].searchStops('park')).map((s) => s.name), ['Gamma Park']);
    assert.deepStrictEqual((await stores[i].searchStops('St')).map((s) => s.name), ['Beta Street', 'Delta Station']);
    assert.deepStrictEqual(await stores[i].searchStops('xyz'), []);
    assert.deepStrictEqual(await stores[i].searchStops('a.*'), []); // regex characters are treated as text
  });

  test(`${name}: a trip's stops come back in order, with after-midnight times`, async () => {
    assert.deepStrictEqual(await stores[i].tripStops('NIGHT'), [
      { stop_id: 'A', seq: 1, arr: T('25:10:00'), dep: T('25:10:00') },
      { stop_id: 'D', seq: 2, arr: T('25:20:00'), dep: T('25:20:00') },
    ]);
    assert.deepStrictEqual(await stores[i].stop('Z'), { stop_id: 'Z', name: 'Far Away', code: '9', lat: 45.6, lon: -122.7 });
    assert.strictEqual(await stores[i].stop('nope'), null);
  });
}
