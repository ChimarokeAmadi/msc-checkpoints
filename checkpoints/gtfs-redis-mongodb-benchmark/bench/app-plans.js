// Application-level benchmark: time the WHOLE trip planner (app/planner.js)
// on both databases, for the same random journeys, and count how many
// database calls one plan makes.
//
//   node --max-old-space-size=6144 bench/app-plans.js

const fs = require('fs');
const path = require('path');
const { loadFeed, activeServices } = require('../src/gtfs');
const { RedisStore } = require('../src/redis-store');
const { MongoStore } = require('../src/mongo-store');
const { startRedis, startMongo } = require('../src/servers');
const { Planner } = require('../app/planner');
const { rng, percentiles } = require('./workload');

const DATE = '20261110';
const PLANS = 300;

// Wraps a store so every method call is counted
function counted(store) {
  const counter = { calls: 0 };
  const proxy = new Proxy(store, {
    get(target, prop) {
      const v = target[prop];
      if (typeof v !== 'function' || ['connect', 'close'].includes(prop)) return v;
      return (...args) => {
        counter.calls++;
        return v.apply(target, args);
      };
    },
  });
  return { proxy, counter };
}

async function run(name) {
  const feed = await loadFeed(path.join(__dirname, '..', 'data', 'raw', name));
  const services = activeServices(feed, DATE);
  const served = [...new Set(feed.stopTimes.map((st) => st.stop_id))];
  const rand = rng(7);
  const trips = [];
  for (let i = 0; i < PLANS; i++) {
    trips.push({ from: served[Math.floor(rand() * served.length)], to: served[Math.floor(rand() * served.length)], at: 7 * 3600 + Math.floor(rand() * 12 * 3600) });
  }

  const rs = await startRedis();
  const ms = await startMongo();
  const out = { feed: name, plans: PLANS };
  const answers = {};
  for (const store of [await new RedisStore(rs.url).connect(), await new MongoStore(ms.uri).connect()]) {
    await store.ingest(feed);
    const { proxy, counter } = counted(store);
    const planner = new Planner(proxy, { activeServices: () => services });
    for (const t of trips.slice(0, 30)) await planner.plan(t.from, t.to, DATE, t.at); // warm-up (also fills the caches)
    const ms_ = [];
    const calls = [];
    const results = [];
    for (const t of trips) {
      const before = counter.calls;
      const t0 = performance.now();
      results.push(await planner.plan(t.from, t.to, DATE, t.at));
      ms_.push(performance.now() - t0);
      calls.push(counter.calls - before);
    }
    answers[store.name] = results;
    out[store.name] = {
      ...percentiles(ms_),
      callsPerPlan: percentiles(calls),
      found: results.filter((r) => r.length).length,
      withChange: results.filter((r) => r[0]?.transfers).length,
    };
    console.log(name, store.name, `p50 ${out[store.name].p50.toFixed(1)} ms, p95 ${out[store.name].p95.toFixed(1)} ms, calls p50 ${out[store.name].callsPerPlan.p50}`, `found ${out[store.name].found}/${PLANS}`);
    await store.close();
  }
  // Same journeys from both? (walking distances can differ by a few cm, so
  // the metres shown are compared separately from the rest of the plan)
  const strip = (plan) => JSON.stringify(plan, (k, v) => (k === 'metres' ? undefined : v));
  out.identical = 0;
  out.sameIgnoringMetres = 0;
  out.different = [];
  trips.forEach((t, i) => {
    const [r, m] = [answers.Redis[i], answers.MongoDB[i]];
    if (JSON.stringify(r) === JSON.stringify(m)) out.identical++;
    else if (strip(r) === strip(m)) out.sameIgnoringMetres++;
    else out.different.push({ trip: t, redis: r, mongodb: m });
  });
  console.log(name, 'identical', out.identical, 'same except walk metres', out.sameIgnoringMetres, 'different', out.different.length);
  await rs.stop();
  await ms.stop();
  return out;
}

(async () => {
  const out = {};
  for (const name of ['bigbluebus', 'trimet']) out[name] = await run(name);
  fs.writeFileSync(path.join(__dirname, '..', 'results', 'app-plans.json'), JSON.stringify(out, null, 2));
  console.log('saved results/app-plans.json');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
