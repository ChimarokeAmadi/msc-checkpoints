// Experiment: does a "service-aware" layout fix the slow departures query?
//
// In the TriMet feed only 9% of the timetable rows run on a given day (the
// file holds 47 service periods). The normal layout keeps ALL of a stop's
// departures together, so the query must skip ~10 rows for every useful one.
//
// The service-aware layout splits departures by service as well:
//   Redis:   dep:{stop_id}:{service_id} sorted sets; one pipeline reads the
//            first N of each service running that day, then they are merged
//   MongoDB: index { stop_id, service_id, dep }; MongoDB merges the index
//            ranges of the services itself (a SORT_MERGE plan)
//
//   node --max-old-space-size=6144 bench/experiment-departures.js

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { loadFeed, activeServices } = require('../src/gtfs');
const { RedisStore } = require('../src/redis-store');
const { MongoStore } = require('../src/mongo-store');
const { startRedis, startMongo } = require('../src/servers');
const { buildWorkload, percentiles } = require('./workload');

const DATE = '20261110';
const SAMPLES = 2000;

async function addServiceAwareRedis(redis, feed) {
  const byKey = new Map();
  for (const st of feed.stopTimes) {
    const trip = feed.tripById.get(st.trip_id);
    const key = `dep2:${st.stop_id}:${trip.service_id}`;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push({ score: st.dep, value: `${st.trip_id}|${st.seq}|${trip.route_id}` });
  }
  const keys = [...byKey.keys()];
  for (let i = 0; i < keys.length; i += 500) {
    const multi = redis.client.multi();
    for (const k of keys.slice(i, i + 500)) multi.zAdd(k, byKey.get(k));
    await multi.execAsPipeline();
  }
  return keys.length;
}

async function departuresRedisV2(redis, stopId, fromSecs, services, limit) {
  const multi = redis.client.multi();
  const list = [...services];
  for (const s of list) multi.zRangeByScoreWithScores(`dep2:${stopId}:${s}`, fromSecs, '+inf', { LIMIT: { offset: 0, count: limit } });
  const replies = await multi.execAsPipeline();
  const all = replies.flat().map(({ value, score }) => {
    const [trip_id, seq, route_id] = value.split('|');
    return { trip_id, route_id, seq: Number(seq), dep: score };
  });
  return all.sort((a, b) => a.dep - b.dep || a.trip_id.localeCompare(b.trip_id)).slice(0, limit);
}

// Same query, forced onto one index or the other (otherwise MongoDB's planner
// may quietly use the new index for the "normal" query too)
async function departuresMongo(mongo, stopId, fromSecs, services, limit, hint) {
  return mongo.db
    .collection('stop_times')
    .find({ stop_id: stopId, service_id: { $in: [...services] }, dep: { $gte: fromSecs } }, { projection: { _id: 0, trip_id: 1, route_id: 1, seq: 1, dep: 1 } })
    .sort({ dep: 1 })
    .limit(limit)
    .hint(hint)
    .toArray();
}
const NORMAL = { stop_id: 1, dep: 1 };
const SERVICE_AWARE = { stop_id: 1, service_id: 1, dep: 1 };

async function time(fn, list) {
  for (const q of list.slice(0, 200)) await fn(q);
  const ms = [];
  for (const q of list) {
    const t0 = performance.now();
    await fn(q);
    ms.push(performance.now() - t0);
  }
  return percentiles(ms);
}

async function run(name) {
  const feed = await loadFeed(path.join(__dirname, '..', 'data', 'raw', name));
  const services = activeServices(feed, DATE);
  const activeRows = feed.stopTimes.filter((st) => services.has(feed.tripById.get(st.trip_id).service_id)).length;
  const rs = await startRedis();
  const ms = await startMongo();
  const redis = await new RedisStore(rs.url).connect();
  const mongo = await new MongoStore(ms.uri).connect();
  await redis.ingest(feed);
  await mongo.ingest(feed);
  const before = { redis: (await redis.memory()).usedBytes, mongoIndex: (await mongo.memory()).indexBytes };

  const extraKeys = await addServiceAwareRedis(redis, feed);
  await mongo.db.collection('stop_times').createIndex({ stop_id: 1, service_id: 1, dep: 1 });
  const after = { redis: (await redis.memory()).usedBytes, mongoIndex: (await mongo.memory()).indexBytes };

  const list = buildWorkload(feed, services, SAMPLES).w.departures;

  // The new layouts must give the same departure times as the normal ones
  let same = 0;
  for (const q of list) {
    const base = await redis.departures(q.stopId, q.from, services, q.limit);
    const r2 = await departuresRedisV2(redis, q.stopId, q.from, services, q.limit);
    const m1 = await departuresMongo(mongo, q.stopId, q.from, services, q.limit, NORMAL);
    const m2 = await departuresMongo(mongo, q.stopId, q.from, services, q.limit, SERVICE_AWARE);
    assert.deepStrictEqual(m1.map((d) => d.dep), base.map((d) => d.dep));
    assert.deepStrictEqual(r2.map((d) => d.dep), base.map((d) => d.dep));
    assert.deepStrictEqual(m2.map((d) => d.dep), base.map((d) => d.dep));
    same++;
  }

  // How much work does MongoDB do per query? (explain on the busiest stop at 08:00)
  const perStop = new Map();
  for (const st of feed.stopTimes) perStop.set(st.stop_id, (perStop.get(st.stop_id) || 0) + 1);
  const busiest = [...perStop].sort((a, b) => b[1] - a[1])[0][0];
  const busy = { stopId: busiest, from: 8 * 3600 };
  const explain = async (hint) =>
    (
      await mongo.db
        .collection('stop_times')
        .find({ stop_id: busy.stopId, service_id: { $in: [...services] }, dep: { $gte: busy.from } })
        .sort({ dep: 1 })
        .limit(10)
        .hint(hint)
        .explain('executionStats')
    ).executionStats;
  const e1 = await explain(NORMAL);
  const e2 = await explain(SERVICE_AWARE);

  const auto = await mongo.db.collection('stop_times').find({ stop_id: busy.stopId, service_id: { $in: [...services] }, dep: { $gte: busy.from } }).sort({ dep: 1 }).limit(10).explain('queryPlanner');
  const planText = JSON.stringify(auto.queryPlanner.winningPlan);
  const plannerPicks = planText.includes('service_id_1') ? 'service-aware index' : 'normal index';

  const result = {
    plannerPicks,
    feed: name,
    activeServices: services.size,
    activeRowShare: activeRows / feed.stopTimes.length,
    checked: same,
    latency: {
      'Redis, normal layout': await time((q) => redis.departures(q.stopId, q.from, services, q.limit), list),
      'Redis, service-aware': await time((q) => departuresRedisV2(redis, q.stopId, q.from, services, q.limit), list),
      'MongoDB, normal index': await time((q) => departuresMongo(mongo, q.stopId, q.from, services, q.limit, NORMAL), list),
      'MongoDB, service-aware index': await time((q) => departuresMongo(mongo, q.stopId, q.from, services, q.limit, SERVICE_AWARE), list),
    },
    cost: { redisExtraBytes: after.redis - before.redis, redisExtraKeys: extraKeys, mongoExtraIndexBytes: after.mongoIndex - before.mongoIndex },
    explain: {
      stop: busiest,
      normal: { keysExamined: e1.totalKeysExamined, docsExamined: e1.totalDocsExamined, returned: e1.nReturned },
      serviceAware: { keysExamined: e2.totalKeysExamined, docsExamined: e2.totalDocsExamined, returned: e2.nReturned },
    },
  };
  await redis.close();
  await mongo.close();
  await rs.stop();
  await ms.stop();
  return result;
}

(async () => {
  const out = {};
  for (const name of ['bigbluebus', 'trimet']) {
    out[name] = await run(name);
    const l = out[name].latency;
    console.log(name, Object.fromEntries(Object.entries(l).map(([k, v]) => [k, `${v.p50.toFixed(3)} / ${v.p95.toFixed(3)} ms`])), out[name].cost, out[name].explain);
  }
  fs.writeFileSync(path.join(__dirname, '..', 'results', 'experiment-departures.json'), JSON.stringify(out, null, 2));
  console.log('saved results/experiment-departures.json');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
