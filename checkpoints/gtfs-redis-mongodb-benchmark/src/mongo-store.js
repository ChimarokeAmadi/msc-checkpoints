// The GTFS data in MONGODB.
//
// MongoDB stores documents and has a query language and secondary indexes, so
// the data can stay close to the GTFS files themselves:
//
//   stops       { _id: stop_id, name, code, location: GeoJSON Point, search: [name words] }
//               indexes: 2dsphere on location, { search } for name search
//   routes      { _id: route_id, short_name, long_name, type, color }
//   trips       { _id: trip_id, route_id, service_id, headsign, direction_id }
//   stop_times  { trip_id, stop_id, seq, arr, dep, service_id, route_id }
//               indexes: { stop_id, dep }  -> "next departures from a stop"
//                        { trip_id, seq }  -> "where does this trip go"
//
// service_id and route_id are copied into stop_times (a little denormalisation)
// so the departures query doesn't need a join ($lookup) to trips.

const { MongoClient } = require('mongodb');
const { bestJourneys, searchKeys, byName } = require('./journeys');

class MongoStore {
  constructor(uri, dbName = 'gtfs') {
    this.name = 'MongoDB';
    this.client = new MongoClient(uri);
    this.dbName = dbName;
  }

  async connect() {
    await this.client.connect();
    this.db = this.client.db(this.dbName);
    return this;
  }

  async close() {
    await this.client.close();
  }

  async reset() {
    await this.db.dropDatabase();
  }

  async #insert(collection, docs, batch) {
    for (let i = 0; i < docs.length; i += batch) {
      await this.db.collection(collection).insertMany(docs.slice(i, i + batch), { ordered: false });
    }
  }

  async ingest(feed, { batch = 10000 } = {}) {
    const t0 = performance.now();
    await this.#insert(
      'stops',
      feed.stops.map((s) => ({ _id: s.stop_id, name: s.name, code: s.code, location: { type: 'Point', coordinates: [s.lon, s.lat] }, search: searchKeys(s.name) })),
      batch,
    );
    await this.#insert('routes', feed.routes.map((r) => ({ _id: r.route_id, short_name: r.short_name, long_name: r.long_name, type: r.type, color: r.color })), batch);
    await this.#insert(
      'trips',
      feed.trips.map((t) => ({ _id: t.trip_id, route_id: t.route_id, service_id: t.service_id, headsign: t.headsign, direction_id: t.direction_id })),
      batch,
    );
    await this.#insert(
      'stop_times',
      feed.stopTimes.map((st) => {
        const trip = feed.tripById.get(st.trip_id);
        return { trip_id: st.trip_id, stop_id: st.stop_id, seq: st.seq, arr: st.arr, dep: st.dep, service_id: trip.service_id, route_id: trip.route_id };
      }),
      batch,
    );
    const loadMs = performance.now() - t0;

    // Indexes are built AFTER the bulk load (faster than updating them on every insert)
    const t1 = performance.now();
    await this.db.collection('stops').createIndex({ location: '2dsphere' });
    await this.db.collection('stops').createIndex({ search: 1 });
    await this.db.collection('stop_times').createIndex({ stop_id: 1, dep: 1 });
    await this.db.collection('stop_times').createIndex({ trip_id: 1, seq: 1 });
    const indexMs = performance.now() - t1;
    return { ms: performance.now() - t0, loadMs, indexMs };
  }

  async memory() {
    // Flush to disk first, otherwise storageSize can still be near zero
    await this.client.db('admin').command({ fsync: 1 });
    const s = await this.db.stats();
    return { dataBytes: s.dataSize, storageBytes: s.storageSize, indexBytes: s.indexSize, documents: s.objects };
  }

  // ---------------------------------------------------------------- queries

  async stop(stopId) {
    const d = await this.db.collection('stops').findOne({ _id: stopId });
    if (!d) return null;
    return { stop_id: d._id, name: d.name, code: d.code, lat: d.location.coordinates[1], lon: d.location.coordinates[0] };
  }

  async route(routeId) {
    const d = await this.db.collection('routes').findOne({ _id: routeId });
    return d && { route_id: d._id, short_name: d.short_name, long_name: d.long_name, type: d.type, color: d.color };
  }

  // An anchored regex ("starts with") can use the { search } index
  async searchStops(text, limit = 10) {
    const q = text.toLowerCase().trim();
    if (!q) return [];
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const docs = await this.db.collection('stops').find({ search: { $regex: `^${escaped}` } }, { projection: { name: 1 } }).limit(1000).toArray();
    return docs.map((d) => ({ stop_id: d._id, name: d.name })).sort(byName).slice(0, limit);
  }

  // $geoNear uses the 2dsphere index and returns the distance in metres
  async nearbyStops(lat, lon, radiusM, limit) {
    const docs = await this.db
      .collection('stops')
      .aggregate([
        { $geoNear: { near: { type: 'Point', coordinates: [lon, lat] }, distanceField: 'distance', maxDistance: radiusM, spherical: true } },
        { $limit: limit },
        { $project: { name: 1, distance: 1 } },
      ])
      .toArray();
    return docs.map((d) => ({ stop_id: d._id, name: d.name, distance: d.distance }));
  }

  // The { stop_id, dep } index gives the departures in time order; the
  // service filter is checked on each index entry's document
  async departures(stopId, fromSecs, services, limit, toSecs) {
    const dep = toSecs == null ? { $gte: fromSecs } : { $gte: fromSecs, $lte: toSecs };
    const docs = await this.db
      .collection('stop_times')
      .find({ stop_id: stopId, dep, service_id: { $in: [...services] } }, { projection: { _id: 0, trip_id: 1, route_id: 1, seq: 1, dep: 1 } })
      .sort({ dep: 1 })
      .limit(limit)
      .toArray();
    return docs;
  }

  async tripStops(tripId) {
    return this.db
      .collection('stop_times')
      .find({ trip_id: tripId }, { projection: { _id: 0, stop_id: 1, seq: 1, arr: 1, dep: 1 } })
      .sort({ seq: 1 })
      .toArray();
  }

  // Same two steps as Redis: departures at A, then ONE query finds stop B in
  // those trips (using the { trip_id, seq } index)
  async directTrips(fromStop, toStop, fromSecs, services, { windowSecs = 7200, limit = 5 } = {}) {
    const candidates = await this.departures(fromStop, fromSecs, services, 200, fromSecs + windowSecs);
    if (candidates.length === 0) return [];
    const tripIds = [...new Set(candidates.map((c) => c.trip_id))];
    const atB = await this.db
      .collection('stop_times')
      .find({ trip_id: { $in: tripIds }, stop_id: toStop }, { projection: { _id: 0, trip_id: 1, seq: 1, arr: 1 } })
      .sort({ trip_id: 1, seq: 1 })
      .toArray();
    const bByTrip = new Map();
    for (const b of atB) {
      if (!bByTrip.has(b.trip_id)) bByTrip.set(b.trip_id, []);
      bByTrip.get(b.trip_id).push(b); // already in stop order
    }
    const rides = [];
    for (const c of candidates) {
      // the first time B appears after this visit to A
      const b = (bByTrip.get(c.trip_id) || []).find((x) => x.seq > c.seq);
      if (b) rides.push({ trip_id: c.trip_id, route_id: c.route_id, dep: c.dep, arr: b.arr, toSeq: b.seq });
    }
    return bestJourneys(rides, limit);
  }
}

module.exports = { MongoStore };
