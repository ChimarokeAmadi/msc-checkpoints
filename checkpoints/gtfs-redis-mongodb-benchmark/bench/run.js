// The benchmark: loads each GTFS feed into Redis and MongoDB, checks that both
// give the same answers, then measures ingestion, memory/storage, query latency
// and throughput. Results go to results/<feed>.json.
//
//   node --max-old-space-size=6144 bench/run.js            (both feeds)
//   node --max-old-space-size=6144 bench/run.js bigbluebus (one feed)

const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { loadFeed, activeServices } = require('../src/gtfs');
const { RedisStore } = require('../src/redis-store');
const { MongoStore } = require('../src/mongo-store');
const { startRedis, startMongo } = require('../src/servers');
const { buildWorkload, QUERIES, median, percentiles } = require('./workload');

const DATE = '20261110'; // Tuesday 10 November 2026: both feeds are valid that day
const SAMPLES = Number(process.env.SAMPLES || 2000); // timed queries per query type per database
const WARMUP = 200;
const INGEST_RUNS = 3;
const CONCURRENCY = [1, 8, 32, 128];
const THROUGHPUT_OPS = 6000;
const FEEDS = process.argv.slice(2).length ? process.argv.slice(2) : ['bigbluebus', 'trimet'];
const RESULTS = path.join(__dirname, '..', 'results');

// ---------------------------------------------------------------------------
// Are the answers the same? Geo distances differ by a few cm between the two
// databases (different Earth models), so near-ties are accepted.
// ---------------------------------------------------------------------------
function sameAnswer(type, a, b) {
  try {
    if (type === 'nearby') {
      if (a.map((x) => x.stop_id).join() === b.map((x) => x.stop_id).join()) return 'exact';
      const cut = Math.min(a.at(-1)?.distance ?? Infinity, b.at(-1)?.distance ?? Infinity) - 2;
      const keep = (l) => l.filter((x) => x.distance < cut && x.distance < 498).map((x) => x.stop_id).sort().join();
      return keep(a) === keep(b) ? 'equivalent' : 'different';
    }
    if (type === 'departures') {
      assert.deepStrictEqual(a.map((x) => x.dep), b.map((x) => x.dep));
      const last = a.at(-1)?.dep;
      const before = (l) => l.filter((x) => x.dep < last).map((x) => x.trip_id).sort().join();
      if (a.map((x) => x.trip_id).join() === b.map((x) => x.trip_id).join()) return 'exact';
      return before(a) === before(b) ? 'equivalent' : 'different'; // same-minute ties can come back in either order
    }
    assert.deepStrictEqual(a, b);
    return 'exact';
  } catch {
    return 'different';
  }
}

async function timeQueries(db, type, list, services) {
  for (const q of list.slice(0, WARMUP)) await QUERIES[type](db, q, services);
  const ms = [];
  let results = 0;
  for (const q of list) {
    const t0 = performance.now();
    const r = await QUERIES[type](db, q, services);
    ms.push(performance.now() - t0);
    results += Array.isArray(r) ? r.length : r ? 1 : 0;
  }
  return { ...percentiles(ms), avgResults: results / list.length };
}

// Many "users" at once: `concurrency` async workers share THROUGHPUT_OPS
// operations from a realistic mix (mostly departure boards and nearby stops)
const MIX = [...Array(35).fill('departures'), ...Array(20).fill('nearby'), ...Array(20).fill('direct'), ...Array(10).fill('search'), ...Array(10).fill('trip'), ...Array(5).fill('stop')];
async function throughput(db, w, services, concurrency) {
  let next = 0;
  const lat = [];
  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= THROUGHPUT_OPS) return;
      const type = MIX[i % MIX.length];
      const list = w[type];
      const t0 = performance.now();
      await QUERIES[type](db, list[i % list.length], services);
      lat.push(performance.now() - t0);
    }
  };
  const t0 = performance.now();
  await Promise.all(Array.from({ length: concurrency }, worker));
  const secs = (performance.now() - t0) / 1000;
  return { concurrency, opsPerSec: THROUGHPUT_OPS / secs, ...percentiles(lat) };
}

// ---------------------------------------------------------------------------
async function benchFeed(name) {
  const log = (...a) => console.log(`[${name}]`, ...a);
  const out = { feed: name, date: DATE, samples: SAMPLES };

  let t0 = performance.now();
  const feed = await loadFeed(path.join(__dirname, '..', 'data', 'raw', name));
  const services = activeServices(feed, DATE);
  out.parseMs = performance.now() - t0;
  out.counts = { stops: feed.stops.length, routes: feed.routes.length, trips: feed.trips.length, stopTimes: feed.stopTimes.length, activeServices: services.size };
  log('loaded', out.counts, `in ${(out.parseMs / 1000).toFixed(1)} s`);

  const rs = await startRedis();
  const rsAof = await startRedis({ persistence: true });
  const ms = await startMongo();
  const redis = await new RedisStore(rs.url).connect();
  const redisAof = await new RedisStore(rsAof.url).connect();
  const mongo = await new MongoStore(ms.uri).connect();
  out.versions = {
    redis: (await redis.client.info('server')).match(/redis_version:(\S+)/)[1],
    mongodb: (await mongo.db.admin().serverInfo()).version,
  };

  // ---- ingestion (median of INGEST_RUNS, starting from an empty database each time)
  out.ingest = {};
  for (const [label, db] of [['Redis', redis], ['Redis + AOF', redisAof], ['MongoDB', mongo]]) {
    const runs = [];
    for (let i = 0; i < INGEST_RUNS; i++) {
      await db.reset();
      runs.push(await db.ingest(feed));
    }
    const best = runs.find((r) => r.ms === median(runs.map((x) => x.ms)));
    out.ingest[label] = { ...best, runs: runs.map((r) => r.ms) };
    log(`ingest ${label}: ${(best.ms / 1000).toFixed(2)} s (runs: ${runs.map((r) => (r.ms / 1000).toFixed(2)).join(', ')})`);
  }
  out.ingest['Redis'].rowsPerSec = feed.stopTimes.length / (out.ingest['Redis'].ms / 1000);
  out.ingest['MongoDB'].rowsPerSec = feed.stopTimes.length / (out.ingest['MongoDB'].ms / 1000);
  await redisAof.close();
  await rsAof.stop();

  // ---- memory / storage
  out.memory = { redis: await redis.memory(), mongodb: await mongo.memory() };
  log('memory', out.memory);

  // ---- workload + correctness
  const { w, activeTrips, servedStops } = buildWorkload(feed, services, SAMPLES);
  out.workload = { activeTrips, servedStops };
  out.correctness = {};
  for (const type of Object.keys(QUERIES)) {
    const tally = { exact: 0, equivalent: 0, different: 0 };
    for (const q of w[type]) {
      const [a, b] = await Promise.all([QUERIES[type](redis, q, services), QUERIES[type](mongo, q, services)]);
      tally[sameAnswer(type, a, b)]++;
    }
    out.correctness[type] = tally;
  }
  log('correctness', out.correctness);

  // ---- latency (alternating which database goes first)
  out.latency = {};
  let order = [redis, mongo];
  for (const type of Object.keys(QUERIES)) {
    out.latency[type] = {};
    for (const db of order) out.latency[type][db.name] = await timeQueries(db, type, w[type], services);
    order = order.reverse();
    log(`latency ${type}: Redis p50 ${out.latency[type].Redis.p50.toFixed(3)} ms, MongoDB p50 ${out.latency[type].MongoDB.p50.toFixed(3)} ms`);
  }

  // ---- throughput
  out.throughput = { Redis: [], MongoDB: [] };
  for (const c of CONCURRENCY) {
    for (const db of [redis, mongo]) {
      const r = await throughput(db, w, services, c);
      out.throughput[db.name].push(r);
      log(`throughput ${db.name} x${c}: ${Math.round(r.opsPerSec)} ops/s (p95 ${r.p95.toFixed(2)} ms)`);
    }
  }

  await redis.close();
  await mongo.close();
  await rs.stop();
  await ms.stop();
  return out;
}

(async () => {
  fs.mkdirSync(RESULTS, { recursive: true });
  const machine = { cpu: os.cpus()[0].model, cores: os.cpus().length, ramGB: Math.round(os.totalmem() / 2 ** 30), node: process.version, platform: `${os.platform()} ${os.release()}` };
  console.log('machine', machine);
  for (const name of FEEDS) {
    const result = await benchFeed(name);
    result.machine = machine;
    result.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(RESULTS, `${name}.json`), JSON.stringify(result, null, 2));
    console.log(`[${name}] saved results/${name}.json`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
