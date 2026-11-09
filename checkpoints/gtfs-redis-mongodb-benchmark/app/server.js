// A small trip-planning web app on top of the GTFS data.
//
//   npm run app                      MongoDB (my recommendation), Big Blue Bus data
//   DB=redis npm run app             the same app on Redis
//   FEED=trimet npm run app          the bigger TriMet feed (takes ~30 s to load)
//
// Without MONGO_URI / REDIS_URL it starts a temporary database, so it runs
// with nothing installed. Then open http://localhost:3000

const path = require('path');
const express = require('express');
const { loadFeed, activeServices, toSeconds } = require('../src/gtfs');
const { RedisStore } = require('../src/redis-store');
const { MongoStore } = require('../src/mongo-store');
const { startRedis, startMongo } = require('../src/servers');
const { Planner } = require('./planner');

const DB = (process.env.DB || 'mongodb').toLowerCase();
const FEED = process.env.FEED || 'bigbluebus';
const PORT = process.env.PORT || 3000;

// "YYYY-MM-DD" or "YYYYMMDD" -> "YYYYMMDD"; "HH:MM" -> seconds
const toGtfsDate = (d) => String(d || '').replace(/-/g, '');
const isDate = (d) => /^\d{8}$/.test(d);
const isTime = (t) => /^\d{1,2}:\d{2}$/.test(t || '');

async function openStore() {
  if (DB === 'redis') {
    const url = process.env.REDIS_URL || (await startRedis()).url;
    return new RedisStore(url).connect();
  }
  const uri = process.env.MONGO_URI || (await startMongo()).uri;
  return new MongoStore(uri, `gtfs_${FEED}`).connect();
}

async function createApp(store, feed) {
  // The service calendar is tiny, so it stays in memory; everything else is
  // read from the database on each request
  const calendar = { calendar: feed.calendar, calendarDates: feed.calendarDates };
  const cache = new Map();
  const planner = new Planner(store, {
    activeServices: (date) => {
      if (!cache.has(date)) cache.set(date, activeServices(calendar, date));
      return cache.get(date);
    },
  });
  const info = {
    database: store.name,
    feed: feed.name,
    agency: feed.agency,
    validFrom: feed.validFrom,
    validTo: feed.validTo,
    counts: { stops: feed.stops.length, routes: feed.routes.length, trips: feed.trips.length, stopTimes: feed.stopTimes.length },
  };

  const app = express();
  app.use(express.static(path.join(__dirname, 'public')));

  // Small helper: run an async handler and turn errors into JSON
  const handle = (fn) => async (req, res) => {
    try {
      const t0 = performance.now();
      const body = await fn(req, res);
      if (body !== undefined) res.json({ ...body, ms: Number((performance.now() - t0).toFixed(2)) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Something went wrong' });
    }
  };
  // Reads ?date=YYYY-MM-DD&time=HH:MM, or answers 400
  const when = (req, res) => {
    const date = toGtfsDate(req.query.date);
    const time = req.query.time || '08:00';
    if (!isDate(date) || !isTime(time)) {
      res.status(400).json({ message: 'Use date=YYYY-MM-DD and time=HH:MM' });
      return null;
    }
    return { date, secs: toSeconds(`${time}:00`) };
  };

  app.get('/api/info', handle(async () => info));

  app.get('/api/stops/search', handle(async (req) => ({ stops: await store.searchStops(String(req.query.q || ''), 8) })));

  app.get(
    '/api/stops/near',
    handle(async (req, res) => {
      const lat = Number(req.query.lat);
      const lon = Number(req.query.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return void res.status(400).json({ message: 'lat and lon are required' });
      return { stops: await store.nearbyStops(lat, lon, Math.min(Number(req.query.radius) || 500, 5000), 10) };
    }),
  );

  app.get(
    '/api/departures/:stopId',
    handle(async (req, res) => {
      const w = when(req, res);
      if (!w) return undefined;
      const stop = await store.stop(req.params.stopId);
      if (!stop) return void res.status(404).json({ message: 'Unknown stop' });
      return { stop, departures: await planner.departureBoard(stop.stop_id, w.date, w.secs, 10) };
    }),
  );

  app.get(
    '/api/plan',
    handle(async (req, res) => {
      const w = when(req, res);
      if (!w) return undefined;
      const { from, to } = req.query;
      if (!from || !to || from === to) return void res.status(400).json({ message: 'Choose two different stops' });
      const [a, b] = await Promise.all([store.stop(from), store.stop(to)]);
      if (!a || !b) return void res.status(404).json({ message: 'Unknown stop' });
      return { from: a, to: b, journeys: await planner.plan(from, to, w.date, w.secs) };
    }),
  );

  app.use('/api', (req, res) => res.status(404).json({ message: 'Not found' }));
  return { app, info };
}

async function main() {
  const t0 = performance.now();
  const feed = await loadFeed(path.join(__dirname, '..', 'data', 'raw', FEED));
  const store = await openStore();
  await store.reset();
  await store.ingest(feed);
  const { app, info } = await createApp(store, feed);
  app.listen(PORT, () => {
    console.log(`${info.feed} loaded into ${info.database} in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
    console.log(`Trip planner running on http://localhost:${PORT}`);
  });
}

if (require.main === module) main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});

module.exports = { createApp };
