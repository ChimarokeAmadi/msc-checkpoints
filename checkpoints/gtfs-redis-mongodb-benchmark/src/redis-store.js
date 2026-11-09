// The GTFS data in REDIS.
//
// Redis is a key-value store: there are no tables and no query language, so I
// design the keys around the questions the trip planner asks.
//
//   stop:{stop_id}          HASH   name, code, lat, lon             -> "show this stop"
//   stops:geo               GEO    every stop's position            -> "stops near me"
//   stops:names             ZSET   all scores 0, member = "words of the name\0stop_id",
//                                  read alphabetically with BYLEX     -> "search stops by name"
//   route:{route_id}        HASH   short_name, long_name, type, color
//   trip:{trip_id}          HASH   route_id, service_id, headsign, direction_id
//   trip:{trip_id}:stops    ZSET   score = stop_sequence,           -> "where does this trip go"
//                                  member = "seq|stop_id|arr|dep"
//   dep:{stop_id}           ZSET   score = departure time (seconds),-> "next departures from a stop"
//                                  member = "trip_id|seq|service_id|route_id"
//
// A sorted set (ZSET) keeps its members ordered by score, so "the next
// departures after 08:00" is just a range read on dep:{stop_id}.

const { createClient } = require('redis');
const { bestJourneys, searchKeys, byName } = require('./journeys');

const SEP = '|';

class RedisStore {
  constructor(url) {
    this.name = 'Redis';
    this.client = createClient({ url });
  }

  async connect() {
    await this.client.connect();
    return this;
  }

  async close() {
    await this.client.quit();
  }

  async reset() {
    await this.client.flushAll();
  }

  // Send commands in pipelines of `batch` commands (one network round trip per
  // pipeline instead of one per command)
  async #pipeline(commands, batch) {
    for (let i = 0; i < commands.length; i += batch) {
      const multi = this.client.multi();
      for (const [cmd, ...args] of commands.slice(i, i + batch)) multi[cmd](...args);
      await multi.execAsPipeline();
    }
  }

  async ingest(feed, { batch = 1000 } = {}) {
    const t0 = performance.now();
    const cmds = [];

    for (const s of feed.stops) {
      cmds.push(['hSet', `stop:${s.stop_id}`, { name: s.name, code: s.code, lat: String(s.lat), lon: String(s.lon) }]);
    }
    // GEOADD accepts many points at once
    for (let i = 0; i < feed.stops.length; i += 1000) {
      cmds.push(['geoAdd', 'stops:geo', feed.stops.slice(i, i + 1000).map((s) => ({ longitude: s.lon, latitude: s.lat, member: s.stop_id }))]);
    }
    // With every score equal, a sorted set is ordered alphabetically, so a
    // prefix search is a range read from "sawt" to "sawt\xff"
    for (let i = 0; i < feed.stops.length; i += 1000) {
      const members = feed.stops.slice(i, i + 1000).flatMap((s) => searchKeys(s.name).map((k) => ({ score: 0, value: `${k}\0${s.stop_id}` })));
      if (members.length) cmds.push(['zAdd', 'stops:names', members]);
    }
    for (const r of feed.routes) {
      cmds.push(['hSet', `route:${r.route_id}`, { short_name: r.short_name, long_name: r.long_name, type: String(r.type), color: r.color }]);
    }
    for (const t of feed.trips) {
      cmds.push(['hSet', `trip:${t.trip_id}`, { route_id: t.route_id, service_id: t.service_id, headsign: t.headsign, direction_id: String(t.direction_id ?? '') }]);
    }

    // Group stop_times by trip and by stop, so each sorted set is written with
    // ONE variadic ZADD instead of one command per row
    const byTrip = new Map();
    const byStop = new Map();
    for (const st of feed.stopTimes) {
      const trip = feed.tripById.get(st.trip_id);
      if (!byTrip.has(st.trip_id)) byTrip.set(st.trip_id, []);
      byTrip.get(st.trip_id).push({ score: st.seq, value: [st.seq, st.stop_id, st.arr, st.dep].join(SEP) });
      if (!byStop.has(st.stop_id)) byStop.set(st.stop_id, []);
      byStop.get(st.stop_id).push({ score: st.dep, value: [st.trip_id, st.seq, trip.service_id, trip.route_id].join(SEP) });
    }
    for (const [tripId, members] of byTrip) cmds.push(['zAdd', `trip:${tripId}:stops`, members]);
    for (const [stopId, members] of byStop) {
      // very busy stops are split into chunks of 5,000 members per ZADD
      for (let i = 0; i < members.length; i += 5000) cmds.push(['zAdd', `dep:${stopId}`, members.slice(i, i + 5000)]);
    }

    await this.#pipeline(cmds, batch);
    return { ms: performance.now() - t0, commands: cmds.length };
  }

  async memory() {
    const stats = await this.client.sendCommand(['MEMORY', 'STATS']);
    // node-redis returns MEMORY STATS as an object; older versions as a flat
    // [name, value, name, value, ...] list
    let map = stats;
    if (Array.isArray(stats)) {
      map = {};
      for (let i = 0; i < stats.length; i += 2) map[stats[i]] = stats[i + 1];
    }
    const keys = await this.client.dbSize();
    return { usedBytes: Number(map['total.allocated']), datasetBytes: Number(map['dataset.bytes']), keys };
  }

  // ---------------------------------------------------------------- queries

  async stop(stopId) {
    const h = await this.client.hGetAll(`stop:${stopId}`);
    if (!h.name && h.name !== '') return null;
    return { stop_id: stopId, name: h.name, code: h.code, lat: Number(h.lat), lon: Number(h.lon) };
  }

  async route(routeId) {
    const h = await this.client.hGetAll(`route:${routeId}`);
    return h.short_name === undefined ? null : { route_id: routeId, short_name: h.short_name, long_name: h.long_name, type: Number(h.type), color: h.color };
  }

  async searchStops(text, limit = 10) {
    const q = text.toLowerCase().trim();
    if (!q) return [];
    const rows = await this.client.zRange('stops:names', `[${q}`, `[${q}\xff`, { BY: 'LEX', LIMIT: { offset: 0, count: 1000 } });
    const ids = [...new Set(rows.map((r) => r.split('\0')[1]))];
    const multi = this.client.multi();
    for (const id of ids) multi.hGet(`stop:${id}`, 'name');
    const names = ids.length ? await multi.execAsPipeline() : [];
    return ids.map((id, i) => ({ stop_id: id, name: names[i] })).sort(byName).slice(0, limit);
  }

  // GEOSEARCH finds the closest stops, then ONE pipeline fetches their names
  async nearbyStops(lat, lon, radiusM, limit) {
    const found = await this.client.geoSearchWith(
      'stops:geo',
      { longitude: lon, latitude: lat },
      { radius: radiusM, unit: 'm' },
      ['WITHDIST'],
      { SORT: 'ASC', COUNT: limit },
    );
    const multi = this.client.multi();
    for (const f of found) multi.hGet(`stop:${f.member}`, 'name');
    const names = found.length ? await multi.execAsPipeline() : [];
    return found.map((f, i) => ({ stop_id: f.member, name: names[i], distance: Number(f.distance) }));
  }

  // Next departures from a stop after `fromSecs`, for the services running
  // that day. The sorted set is read in time order, a chunk at a time, and
  // departures of services that don't run that day are skipped.
  async departures(stopId, fromSecs, services, limit, toSecs = '+inf') {
    const out = [];
    const chunk = Math.max(limit * 4, 50);
    let offset = 0;
    for (;;) {
      const rows = await this.client.zRangeWithScores(`dep:${stopId}`, fromSecs, toSecs, { BY: 'SCORE', LIMIT: { offset, count: chunk } });
      for (const { value, score } of rows) {
        const [trip_id, seq, service_id, route_id] = value.split(SEP);
        if (!services.has(service_id)) continue;
        out.push({ trip_id, route_id, seq: Number(seq), dep: score });
        if (out.length === limit) return out;
      }
      if (rows.length < chunk) return out;
      offset += chunk;
    }
  }

  async tripStops(tripId) {
    const rows = await this.client.zRange(`trip:${tripId}:stops`, 0, -1);
    return rows.map((v) => {
      const [seq, stop_id, arr, dep] = v.split(SEP);
      return { stop_id, seq: Number(seq), arr: Number(arr), dep: Number(dep) };
    });
  }

  // Trips that go directly from stop A to stop B, leaving A within `windowSecs`
  // after `fromSecs`. Step 1: departures at A. Step 2: one pipeline reads the
  // rest of each of those trips and looks for B after A.
  async directTrips(fromStop, toStop, fromSecs, services, { windowSecs = 7200, limit = 5 } = {}) {
    const candidates = await this.departures(fromStop, fromSecs, services, 200, fromSecs + windowSecs);
    if (candidates.length === 0) return [];
    const multi = this.client.multi();
    for (const c of candidates) multi.zRangeByScore(`trip:${c.trip_id}:stops`, `(${c.seq}`, '+inf');
    const rests = await multi.execAsPipeline();
    const rides = [];
    candidates.forEach((c, i) => {
      // the first time B appears after this visit to A
      for (const v of rests[i]) {
        const [seq, stop_id, arr] = v.split(SEP);
        if (stop_id === toStop) {
          rides.push({ trip_id: c.trip_id, route_id: c.route_id, dep: c.dep, arr: Number(arr), toSeq: Number(seq) });
          break;
        }
      }
    });
    return bestJourneys(rides, limit);
  }
}

module.exports = { RedisStore };
