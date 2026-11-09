// The benchmark workload, shared by bench/run.js and bench/experiment-departures.js

// Same "random" queries on every run, so results are repeatable
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
function percentiles(ms) {
  const s = [...ms].sort((a, b) => a - b);
  const p = (q) => s[Math.min(s.length - 1, Math.floor(q * s.length))];
  return { p50: p(0.5), p95: p(0.95), p99: p(0.99), mean: s.reduce((a, b) => a + b, 0) / s.length, max: s[s.length - 1] };
}

// ---------------------------------------------------------------------------
// The workload: realistic trip-planning questions built from the real timetable
// ---------------------------------------------------------------------------
function buildWorkload(feed, services, n) {
  const rand = rng(42);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const stopsByTrip = new Map();
  for (const st of feed.stopTimes) {
    if (!stopsByTrip.has(st.trip_id)) stopsByTrip.set(st.trip_id, []);
    stopsByTrip.get(st.trip_id).push(st);
  }
  for (const list of stopsByTrip.values()) list.sort((a, b) => a.seq - b.seq);
  const activeTrips = feed.trips.filter((t) => services.has(t.service_id) && stopsByTrip.has(t.trip_id)).map((t) => t.trip_id);
  const longTrips = activeTrips.filter((id) => stopsByTrip.get(id).length >= 3); // A -> B needs a stop in between
  const servedStops = [...new Set(feed.stopTimes.map((st) => st.stop_id))];
  const servedSet = new Set(servedStops);
  const stops = feed.stops.filter((s) => servedSet.has(s.stop_id));

  const w = { stop: [], search: [], nearby: [], departures: [], trip: [], direct: [] };
  for (let i = 0; i < n; i++) {
    w.stop.push({ stopId: pick(feed.stops).stop_id });

    // "Search stops by name": the first 4 letters of a word of a real stop name
    const words = pick(feed.stops).name.split(/\s+/).filter((x) => /^[a-z0-9]/i.test(x));
    w.search.push({ text: (pick(words) || 'main').slice(0, 4) });

    // "Where is the nearest stop?" from a point up to ~300 m away from a real stop
    const s = pick(stops);
    w.nearby.push({ lat: s.lat + (rand() - 0.5) * 0.0054, lon: s.lon + (rand() - 0.5) * 0.0072, radius: 500, limit: 10 });

    // "Next 10 departures from this stop" at a time between 06:00 and 21:00
    w.departures.push({ stopId: pick(servedStops), from: 6 * 3600 + Math.floor(rand() * 15 * 3600), limit: 10 });

    w.trip.push({ tripId: pick(activeTrips) });

    // "How do I get from A to B?": two stops of a real trip, asked a little before it leaves A
    const stopsOfTrip = stopsByTrip.get(pick(longTrips));
    const a = Math.floor(rand() * (stopsOfTrip.length - 2));
    const b = a + 2 + Math.floor(rand() * (stopsOfTrip.length - a - 2));
    w.direct.push({ from: stopsOfTrip[a].stop_id, to: stopsOfTrip[b].stop_id, at: Math.max(0, stopsOfTrip[a].dep - Math.floor(rand() * 1800)) });
  }
  return { w, activeTrips: activeTrips.length, servedStops: servedStops.length };
}

// One function per query type, so both stores are called the same way
const QUERIES = {
  stop: (db, q) => db.stop(q.stopId),
  search: (db, q) => db.searchStops(q.text, 10),
  nearby: (db, q) => db.nearbyStops(q.lat, q.lon, q.radius, q.limit),
  departures: (db, q, services) => db.departures(q.stopId, q.from, services, q.limit),
  trip: (db, q) => db.tripStops(q.tripId),
  direct: (db, q, services) => db.directTrips(q.from, q.to, q.at, services),
};


module.exports = { rng, median, percentiles, buildWorkload, QUERIES };
