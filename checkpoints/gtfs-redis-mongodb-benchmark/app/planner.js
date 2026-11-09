// The trip planner's logic. It only uses the store methods (departures,
// tripStops, directTrips, nearbyStops, ...), so the same code runs on Redis or
// MongoDB.

const { formatTime } = require('../src/gtfs');

const MIN_TRANSFER = 120; // seconds to change bus at the same stop
const WALK_RADIUS = 250; // metres you may walk to another stop to change
const WALK_SPEED = 1.2; // metres per second (a normal walking pace)
const WINDOW = 2 * 3600; // look at departures in the next 2 hours

// Time needed to change: 2 minutes at the same stop, or walking time plus
// 1 minute (to cross the street) for a nearby stop
const changeTime = (metres) => (metres < 1 ? MIN_TRANSFER : Math.max(MIN_TRANSFER, Math.ceil(metres / WALK_SPEED) + 60));

class Planner {
  constructor(store, feedInfo) {
    this.store = store;
    this.feedInfo = feedInfo; // { activeServices(date) }
    this.routeCache = new Map();
    this.nearCache = new Map();
  }

  async routeName(routeId) {
    if (!this.routeCache.has(routeId)) this.routeCache.set(routeId, await this.store.route(routeId));
    const r = this.routeCache.get(routeId);
    return r ? { id: routeId, name: r.short_name || r.long_name, long_name: r.long_name, color: r.color } : { id: routeId, name: routeId };
  }

  async stopName(stopId) {
    return (await this.store.stop(stopId))?.name ?? stopId;
  }

  // Stops within walking distance (including the stop itself), cached because
  // stop positions never change
  async walkable(stopId) {
    if (!this.nearCache.has(stopId)) {
      const s = await this.store.stop(stopId);
      this.nearCache.set(stopId, s ? await this.store.nearbyStops(s.lat, s.lon, WALK_RADIUS, 15) : []);
    }
    return this.nearCache.get(stopId);
  }

  async departureBoard(stopId, date, fromSecs, limit = 10) {
    const services = this.feedInfo.activeServices(date);
    const deps = await this.store.departures(stopId, fromSecs, services, limit);
    return Promise.all(deps.map(async (d) => ({ time: formatTime(d.dep), route: await this.routeName(d.route_id), trip_id: d.trip_id })));
  }

  // 1. Direct buses from A to B.
  // 2. If there are fewer than 3, also:
  //    - walk from A to a stop within 250 m and take one bus to B, or
  //    - journeys with ONE change: buses leaving A (forward search) meet buses
  //      arriving at B (backward search) at the same stop or one within 250 m.
  async plan(from, to, date, fromSecs) {
    const services = this.feedInfo.activeServices(date);
    const journeys = [];

    for (const d of await this.store.directTrips(from, to, fromSecs, services, { windowSecs: WINDOW, limit: 5 })) {
      journeys.push({ dep: d.dep, arr: d.arr, legs: [{ trip_id: d.trip_id, route_id: d.route_id, from, to, dep: d.dep, arr: d.arr }] });
    }

    if (journeys.length < 3) {
      // Forward: every stop the buses from A reach, with every arrival time
      const reach = new Map(); // stop -> [{ arr, leg }]
      for (const d of await this.store.departures(from, fromSecs, services, 30, fromSecs + WINDOW)) {
        for (const st of await this.store.tripStops(d.trip_id)) {
          if (st.seq <= d.seq || st.stop_id === from) continue;
          if (!reach.has(st.stop_id)) reach.set(st.stop_id, []);
          reach.get(st.stop_id).push({ arr: st.arr, leg: { trip_id: d.trip_id, route_id: d.route_id, from, to: st.stop_id, dep: d.dep, arr: st.arr } });
        }
      }

      // Stops you can simply walk to from A (instead of taking a first bus)
      const walkFromA = new Map((await this.walkable(from)).filter((n) => n.stop_id !== from).map((n) => [n.stop_id, n.distance]));

      // Backward: buses arriving at B and the stops they pass before B. At each
      // of those stops, take the LATEST first bus that still makes the change.
      for (const d of await this.store.departures(to, fromSecs, services, 40, fromSecs + 2 * WINDOW)) {
        const stops = await this.store.tripStops(d.trip_id);
        const arrB = stops.find((st) => st.seq === d.seq)?.arr ?? d.dep;
        // If this bus also stops at A before B, just board it at A (the direct
        // search already found it): no walking or changing needed
        if (stops.some((st) => st.stop_id === from && st.seq < d.seq)) continue;
        for (const st of stops) {
          if (st.seq >= d.seq) break;
          if (st.dep < fromSecs) continue;
          // Option 1: walk from A to this stop and take this bus
          if (walkFromA.has(st.stop_id)) {
            const metres = walkFromA.get(st.stop_id);
            const leave = st.dep - changeTime(metres);
            if (leave >= fromSecs) {
              journeys.push({
                dep: leave,
                arr: arrB,
                legs: [
                  { walk: true, from, to: st.stop_id, metres: Math.round(metres), minutes: Math.ceil(metres / WALK_SPEED / 60) },
                  { trip_id: d.trip_id, route_id: d.route_id, from: st.stop_id, to, dep: st.dep, arr: arrB },
                ],
              });
            }
          }
          // Option 2: a first bus from A, then change here
          let best = null;
          for (const near of await this.walkable(st.stop_id)) {
            const need = changeTime(near.distance);
            for (const option of reach.get(near.stop_id) || []) {
              if (option.leg.trip_id === d.trip_id || option.arr + need > st.dep) continue;
              if (!best || option.leg.dep > best.option.leg.dep || (option.leg.dep === best.option.leg.dep && near.distance < best.walk)) {
                best = { option, walk: near.distance };
              }
            }
          }
          if (!best) continue;
          const first = best.option.leg;
          const legs = [first];
          if (best.walk >= 1) legs.push({ walk: true, from: first.to, to: st.stop_id, metres: Math.round(best.walk), minutes: Math.ceil(best.walk / WALK_SPEED / 60) });
          legs.push({ trip_id: d.trip_id, route_id: d.route_id, from: st.stop_id, to, dep: st.dep, arr: arrB });
          journeys.push({ dep: first.dep, arr: arrB, legs });
        }
      }
    }

    // Keep only journeys that no other journey beats (leaves at the same time
    // or later AND arrives at the same time or earlier). Sorted by arrival,
    // then fewer buses, then less walking.
    const buses = (j) => j.legs.filter((l) => !l.walk).length;
    const walked = (j) => j.legs.reduce((m, l) => m + (l.metres || 0), 0);
    journeys.sort((a, b) => a.arr - b.arr || buses(a) - buses(b) || b.dep - a.dep || walked(a) - walked(b));
    const best = [];
    let latestDep = -1;
    for (const j of journeys) {
      if (j.dep <= latestDep) continue;
      latestDep = j.dep;
      best.push(j);
      if (best.length === 5) break;
    }

    // Add names and readable times for the page
    return Promise.all(
      best.map(async (j) => ({
        depart: formatTime(j.dep),
        arrive: formatTime(j.arr),
        minutes: Math.round((j.arr - j.dep) / 60),
        transfers: buses(j) - 1,
        legs: await Promise.all(
          j.legs.map(async (l) =>
            l.walk
              ? { walk: true, metres: l.metres, minutes: l.minutes, from: { id: l.from, name: await this.stopName(l.from) }, to: { id: l.to, name: await this.stopName(l.to) } }
              : {
                  route: await this.routeName(l.route_id),
                  from: { id: l.from, name: await this.stopName(l.from) },
                  to: { id: l.to, name: await this.stopName(l.to) },
                  depart: formatTime(l.dep),
                  arrive: formatTime(l.arr),
                  trip_id: l.trip_id,
                },
          ),
        ),
      })),
    );
  }
}

module.exports = { Planner, changeTime };
