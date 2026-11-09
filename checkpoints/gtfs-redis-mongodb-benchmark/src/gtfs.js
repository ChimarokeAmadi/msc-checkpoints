// Reads a GTFS feed (a folder of .txt CSV files) into plain JavaScript objects.
// Both databases are loaded from exactly the same objects, so the benchmark
// compares the databases and not two different parsers.

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');

// GTFS times are "HH:MM:SS" and can go past 24:00 for trips after midnight
// ("25:10:00" = 1:10 am the next day), so we store seconds since midnight.
function toSeconds(hms) {
  if (!hms) return null;
  const [h, m, s] = hms.trim().split(':').map(Number);
  return h * 3600 + m * 60 + s;
}

function formatTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Stream a CSV file row by row (stop_times.txt has 3.4 million rows for TriMet,
// so we never load the whole text into memory at once).
async function readCsv(file, onRow) {
  if (!fs.existsSync(file)) return;
  const parser = fs.createReadStream(file).pipe(parse({ columns: true, bom: true, skip_empty_lines: true, relax_column_count: true }));
  for await (const row of parser) onRow(row);
}

async function loadFeed(dir) {
  const feed = { name: path.basename(dir), stops: [], routes: [], trips: [], stopTimes: [], calendar: [], calendarDates: [] };

  await readCsv(path.join(dir, 'stops.txt'), (r) => {
    const lat = Number(r.stop_lat);
    const lon = Number(r.stop_lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return;
    feed.stops.push({ stop_id: r.stop_id, name: r.stop_name, code: r.stop_code || '', lat, lon });
  });

  await readCsv(path.join(dir, 'routes.txt'), (r) => {
    feed.routes.push({
      route_id: r.route_id,
      short_name: r.route_short_name || '',
      long_name: r.route_long_name || '',
      type: Number(r.route_type),
      color: r.route_color || '',
    });
  });

  await readCsv(path.join(dir, 'trips.txt'), (r) => {
    feed.trips.push({
      trip_id: r.trip_id,
      route_id: r.route_id,
      service_id: r.service_id,
      headsign: r.trip_headsign || '',
      direction_id: r.direction_id === '' ? null : Number(r.direction_id),
    });
  });

  await readCsv(path.join(dir, 'stop_times.txt'), (r) => {
    const dep = toSeconds(r.departure_time) ?? toSeconds(r.arrival_time);
    const arr = toSeconds(r.arrival_time) ?? dep;
    if (dep == null) return; // untimed stops are skipped (none in our feeds)
    feed.stopTimes.push({ trip_id: r.trip_id, stop_id: r.stop_id, seq: Number(r.stop_sequence), arr, dep });
  });

  // Who runs the network, and which dates the timetable covers
  await readCsv(path.join(dir, 'agency.txt'), (r) => (feed.agency ??= r.agency_name));
  await readCsv(path.join(dir, 'feed_info.txt'), (r) => {
    feed.agency ??= r.feed_publisher_name;
    feed.validFrom = r.feed_start_date;
    feed.validTo = r.feed_end_date;
  });

  await readCsv(path.join(dir, 'calendar.txt'), (r) => feed.calendar.push(r));
  await readCsv(path.join(dir, 'calendar_dates.txt'), (r) => feed.calendarDates.push(r));

  // A few lookups that both stores need while loading
  feed.tripById = new Map(feed.trips.map((t) => [t.trip_id, t]));
  feed.routeById = new Map(feed.routes.map((r) => [r.route_id, r]));
  return feed;
}

// Which service_ids run on a given date ("YYYYMMDD")? This follows the GTFS
// rules: calendar.txt gives the weekly pattern between two dates, and
// calendar_dates.txt adds (1) or removes (2) single days, e.g. holidays.
function activeServices(feed, date) {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(4, 6));
  const d = Number(date.slice(6, 8));
  const weekday = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const active = new Set();
  for (const c of feed.calendar) {
    if (c.start_date <= date && date <= c.end_date && c[weekday] === '1') active.add(c.service_id);
  }
  for (const cd of feed.calendarDates) {
    if (cd.date !== date) continue;
    if (cd.exception_type === '1') active.add(cd.service_id);
    if (cd.exception_type === '2') active.delete(cd.service_id);
  }
  return active;
}

// Distance in metres between two points (used to check the geo queries)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371008.8;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

module.exports = { loadFeed, activeServices, toSeconds, formatTime, haversine };
