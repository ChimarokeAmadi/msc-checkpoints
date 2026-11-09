// Builds report/report.html from the measured results in results/*.json.
// Run the benchmarks first (npm run bench, then the two experiments), then:
//   npm run report
// and print report/report.html to PDF (Chrome: Print -> Save as PDF).

const fs = require('fs');
const path = require('path');
const { groupedBars, lineChart, legend, esc } = require('./charts');

const AUTHOR = 'Chimaroke Amadi';
const dir = path.join(__dirname, '..', 'results');
const BBB = require(path.join(dir, 'bigbluebus.json'));
const TRI = require(path.join(dir, 'trimet.json'));
const EXP = require(path.join(dir, 'experiment-departures.json'));
const APP = require(path.join(dir, 'app-plans.json'));

// ---------------------------------------------------------------- helpers
const n = (x, d = 0) => Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const ms = (x) => (x < 1 ? n(x, 3) : x < 10 ? n(x, 2) : n(x, 1));
const mb = (b) => `${n(b / 1e6, b < 1e7 ? 1 : 0)} MB`;
const secs = (m) => `${n(m / 1000, m < 1000 ? 2 : 1)} s`;
const x = (a, b) => `${n(a / b, a / b < 10 ? 1 : 0)}×`;
const C = { redis: 'var(--s1)', mongo: 'var(--s2)', aof: 'var(--s3)' };
const SERIES = [{ name: 'Redis', color: C.redis }, { name: 'MongoDB', color: C.mongo }];
const Q = {
  stop: 'Stop by id',
  search: 'Search stops by name',
  nearby: 'Stops near a point',
  departures: 'Next departures',
  trip: 'All stops of a trip',
  direct: 'Direct trips A → B',
};
const codeLines = (f) =>
  fs
    .readFileSync(path.join(__dirname, '..', 'src', f), 'utf8')
    .split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith('//')).length;
const totalChecked = (r) => Object.values(r.correctness).reduce((s, c) => s + c.exact + c.equivalent + c.different, 0);
const totalDifferent = (r) => Object.values(r.correctness).reduce((s, c) => s + c.different, 0);
const peak = (list) => list.reduce((a, b) => (b.opsPerSec > a.opsPerSec ? b : a));

const lat = (r, q, db, p = 'p50') => r.latency[q][db][p];
const avgRatio = (r) => {
  const qs = Object.keys(Q).filter((q) => q !== 'search');
  return qs.reduce((s, q) => s + lat(r, q, 'MongoDB') / lat(r, q, 'Redis'), 0) / qs.length;
};
const triMem = TRI.memory;
const mongoDisk = (m) => m.mongodb.storageBytes + m.mongodb.indexBytes;
const expT = EXP.trimet;
const L = expT.latency;

// ---------------------------------------------------------------- charts
const latencyChart = (r) =>
  groupedBars({
    rows: Object.keys(Q).map((q) => ({ label: Q[q], values: [lat(r, q, 'Redis'), lat(r, q, 'MongoDB')] })),
    series: SERIES,
    unit: 'ms',
    digits: 3,
  });

const ingestChart = groupedBars({
  rows: [
    { label: 'Big Blue Bus (124K rows)', values: [BBB.ingest['Redis'].ms / 1000, BBB.ingest['Redis + AOF'].ms / 1000, BBB.ingest['MongoDB'].ms / 1000] },
    { label: 'TriMet (3.4M rows)', values: [TRI.ingest['Redis'].ms / 1000, TRI.ingest['Redis + AOF'].ms / 1000, TRI.ingest['MongoDB'].ms / 1000] },
  ],
  series: [{ name: 'Redis', color: C.redis }, { name: 'Redis + AOF (durable)', color: C.aof }, { name: 'MongoDB (load + indexes)', color: C.mongo }],
  unit: 's',
  digits: 2,
  barH: 13,
});

const memoryChart = groupedBars({
  rows: [
    { label: 'Redis: in RAM', values: [triMem.redis.usedBytes / 1e6] },
    { label: 'MongoDB: data, uncompressed', values: [triMem.mongodb.dataBytes / 1e6] },
    { label: 'MongoDB: on disk (data + indexes)', values: [mongoDisk(triMem) / 1e6] },
  ],
  series: [{ name: 'TriMet feed, MB', color: 'var(--s1)' }],
  unit: 'MB',
  digits: 0,
  labelW: 210,
  barH: 16,
}).replace(/<div class="legend">.*?<\/div>/, ''); // single series: the title says what it is

const tpChart = (r, title) => `<div><div class="mini-title">${title}</div>${lineChart({
  xs: r.throughput.Redis.map((t) => t.concurrency),
  series: [
    { name: 'Redis', color: C.redis, values: r.throughput.Redis.map((t) => t.opsPerSec) },
    { name: 'MongoDB', color: C.mongo, values: r.throughput.MongoDB.map((t) => t.opsPerSec) },
  ],
  xLabel: 'users at the same time',
  yMax: Math.max(...BBB.throughput.Redis.map((t) => t.opsPerSec)),
})}</div>`;

const expChart = groupedBars({
  rows: [
    { label: 'Normal layout', values: [L['Redis, normal layout'].p50, L['MongoDB, normal index'].p50] },
    { label: 'Service-aware layout', values: [L['Redis, service-aware'].p50, L['MongoDB, service-aware index'].p50] },
  ],
  series: SERIES,
  unit: 'ms',
  digits: 3,
  barH: 15,
});

const appChart = groupedBars({
  rows: [
    { label: 'Big Blue Bus, median', values: [APP.bigbluebus.Redis.p50, APP.bigbluebus.MongoDB.p50] },
    { label: 'Big Blue Bus, 95th pct.', values: [APP.bigbluebus.Redis.p95, APP.bigbluebus.MongoDB.p95] },
    { label: 'TriMet, median', values: [APP.trimet.Redis.p50, APP.trimet.MongoDB.p50] },
    { label: 'TriMet, 95th pct.', values: [APP.trimet.Redis.p95, APP.trimet.MongoDB.p95] },
  ],
  series: SERIES,
  unit: 'ms',
  digits: 1,
  barH: 13,
});

// ---------------------------------------------------------------- tables
const latencyTable = `<table class="data">
<thead><tr><th rowspan="2">Query</th><th colspan="3">Big Blue Bus (median ms)</th><th colspan="3">TriMet (median ms)</th><th colspan="2">TriMet 95th percentile (ms)</th></tr>
<tr><th class="num">Redis</th><th class="num">MongoDB</th><th class="num">Mongo ÷ Redis</th><th class="num">Redis</th><th class="num">MongoDB</th><th class="num">Mongo ÷ Redis</th><th class="num">Redis</th><th class="num">MongoDB</th></tr></thead>
${Object.keys(Q)
  .map(
    (q) => `<tr><td>${Q[q]}</td>
  <td class="num">${ms(lat(BBB, q, 'Redis'))}</td><td class="num">${ms(lat(BBB, q, 'MongoDB'))}</td><td class="num">${x(lat(BBB, q, 'MongoDB'), lat(BBB, q, 'Redis'))}</td>
  <td class="num">${ms(lat(TRI, q, 'Redis'))}</td><td class="num">${ms(lat(TRI, q, 'MongoDB'))}</td><td class="num">${x(lat(TRI, q, 'MongoDB'), lat(TRI, q, 'Redis'))}</td>
  <td class="num">${ms(lat(TRI, q, 'Redis', 'p95'))}</td><td class="num">${ms(lat(TRI, q, 'MongoDB', 'p95'))}</td></tr>`,
  )
  .join('')}
</table>`;

const throughputTable = `<table class="data">
<thead><tr><th>Users at the same time</th>${TRI.throughput.Redis.map((t) => `<th class="num">${t.concurrency}</th>`).join('')}</tr></thead>
${[
  ['Big Blue Bus, Redis', BBB.throughput.Redis],
  ['Big Blue Bus, MongoDB', BBB.throughput.MongoDB],
  ['TriMet, Redis', TRI.throughput.Redis],
  ['TriMet, MongoDB', TRI.throughput.MongoDB],
]
  .map(([label, list]) => `<tr><td>${label}</td>${list.map((t) => `<td class="num">${n(t.opsPerSec)} ops/s<br><span class="muted">p95 ${ms(t.p95)} ms</span></td>`).join('')}</tr>`)
  .join('')}
</table>`;

const correctnessRows = (r) =>
  Object.keys(Q)
    .map((q) => {
      const c = r.correctness[q];
      return `<td class="num">${n(c.exact)}${c.equivalent ? ` + ${n(c.equivalent)}*` : ''}</td>`;
    })
    .join('');

// ---------------------------------------------------------------- page
const date = new Date(TRI.finishedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
const ratioAll = avgRatio(TRI);
const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Redis vs MongoDB for GTFS Trip Planning</title>
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }
  :root { --surface: #fcfcfb; --s1: #2a78d6; --s2: #eb6834; --s3: #1baf7a; --ink: #1e293b; --ink2: #52514e; --muted: #64748b; --grid: #e5e7eb; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif; color: var(--ink); font-size: 10.2pt; line-height: 1.5; margin: 0; background: #fff; }
  h1 { font-size: 21pt; margin: 0 0 4px; color: #0f172a; line-height: 1.2; }
  h2 { font-size: 14.5pt; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #2563eb; color: #1e3a8a; break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 16px 0 6px; color: #0f172a; break-after: avoid; }
  p { margin: 6px 0; } ul, ol { margin: 6px 0; padding-left: 22px; } li { margin: 2px 0; }
  .meta { color: var(--muted); margin-bottom: 12px; }
  .lead { background: #eff6ff; border-left: 4px solid #2563eb; padding: 9px 13px; border-radius: 4px; }
  .note-box { background: #fffbeb; border-left: 4px solid #d97706; padding: 9px 13px; border-radius: 4px; margin: 10px 0; break-inside: avoid; }
  .answer { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 8px 13px; border-radius: 4px; margin: 10px 0; break-inside: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 8.8pt; break-inside: avoid; }
  caption { text-align: left; font-weight: 600; margin-bottom: 4px; color: #334155; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 7px; vertical-align: top; text-align: left; }
  th { background: #f1f5f9; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  .muted { color: var(--muted); font-size: 8pt; }
  code, pre { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 8.3pt; }
  code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; }
  pre { background: #0f172a; color: #e2e8f0; padding: 9px 11px; border-radius: 6px; white-space: pre-wrap; break-inside: avoid; margin: 6px 0; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; align-items: start; }
  .figure { break-inside: avoid; margin: 10px 0; padding: 10px 12px; background: var(--surface); border: 1px solid #eceae6; border-radius: 6px; }
  .figure .title { font-weight: 600; font-size: 9.6pt; margin-bottom: 2px; }
  .figure .sub { color: var(--muted); font-size: 8.4pt; margin-bottom: 6px; }
  .mini-title { font-size: 8.8pt; font-weight: 600; color: var(--ink2); }
  .legend { display: flex; gap: 14px; flex-wrap: wrap; font-size: 8.4pt; color: var(--ink2); margin: 2px 0 4px; }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
  svg .grid { stroke: var(--grid); stroke-width: 1; }
  svg .tick { font: 9px sans-serif; fill: var(--muted); }
  svg .label { font: 9.5px sans-serif; fill: var(--ink); }
  svg .value { font: 600 9px sans-serif; fill: var(--ink2); }
  .tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 10px 0; }
  .tile { border: 1px solid #e2e8f0; border-radius: 6px; padding: 7px 9px; break-inside: avoid; }
  .tile .label { font-size: 8pt; color: var(--muted); }
  .tile .value { font-size: 15pt; font-weight: 600; color: #0f172a; line-height: 1.2; }
  .tile .delta { font-size: 8pt; color: var(--ink2); }
  .shot { width: 100%; height: 118mm; object-fit: cover; object-position: top; border: 1px solid #e2e8f0; border-radius: 6px; }
  .shots { display: grid; grid-template-columns: 1.55fr 1fr; gap: 12px; align-items: start; break-inside: avoid; }
  .src { font-size: 8.4pt; color: #475569; } .src li { margin: 3px 0; overflow-wrap: anywhere; }
  .pagebreak { break-before: page; }
  footer { margin-top: 18px; color: var(--muted); font-size: 8.3pt; border-top: 1px solid #e2e8f0; padding-top: 6px; }
</style></head><body>

<h1>Redis vs MongoDB for Trip Planning with GTFS Data</h1>
<div class="meta">An application-based benchmark · ${AUTHOR} · GoMyCode MSC checkpoint · ${date}</div>

<p class="lead">I loaded two <b>real</b> public transport timetables into Redis and MongoDB: Big Blue Bus (Santa Monica, ${n(BBB.counts.stopTimes)} scheduled stops) and TriMet (Portland, <b>${n(TRI.counts.stopTimes)}</b>). Then I ran the questions a trip planner really asks, like "next buses from this stop" and "how do I get from A to B", ${n(BBB.samples)} times each on each database. I checked that both databases gave the same answers, and measured speed, memory, throughput and how the results change when the network is 28 times bigger. Finally, I built a small trip-planner web app that runs on either database.</p>

<div class="tiles">
  <div class="tile"><div class="label">Single queries (TriMet, median)</div><div class="value">${x(ratioAll, 1)}</div><div class="delta">MongoDB time ÷ Redis time, on average</div></div>
  <div class="tile"><div class="label">Whole trip plan (TriMet, median)</div><div class="value">${ms(APP.trimet.Redis.p50)} vs ${ms(APP.trimet.MongoDB.p50)} ms</div><div class="delta">Redis vs MongoDB, about ${APP.trimet.Redis.callsPerPlan.p50} database calls each</div></div>
  <div class="tile"><div class="label">Peak throughput (TriMet)</div><div class="value">${n(peak(TRI.throughput.Redis).opsPerSec / 1000, 1)}K vs ${n(peak(TRI.throughput.MongoDB).opsPerSec / 1000, 1)}K</div><div class="delta">operations per second, Redis vs MongoDB</div></div>
  <div class="tile"><div class="label">Space for TriMet</div><div class="value">${mb(triMem.redis.usedBytes)} vs ${mb(mongoDisk(triMem))}</div><div class="delta">Redis in RAM vs MongoDB on disk</div></div>
</div>
<p><b>The short answer:</b> Redis was faster on every query on the big network (on the small one, MongoDB won only the name search), and much faster for the full app, because a trip plan makes many small calls. But it keeps everything in RAM, and I had to design every "index" by hand. MongoDB needed only ${n(mongoDisk(triMem) / triMem.redis.usedBytes * 100)}% as much space (on disk, versus Redis's RAM), and found the better index by itself. It is also easier to grow beyond one machine. For a large trip-planning service, I would keep the timetable in <b>MongoDB</b> and add <b>Redis as a cache</b> for the hottest answers (section 6).</p>

<h2>1. Introduction to GTFS data</h2>
<h3>What is GTFS, and what does it contain?</h3>
<p><b>GTFS (General Transit Feed Specification)</b> is the standard format that transit agencies use to publish their schedules. It began in 2005 as a project between TriMet in Portland (one of my two test feeds) and Google, which is why it was first called the "Google Transit Feed Specification". Today thousands of agencies publish GTFS, and apps like Google Maps and Transit read it.</p>
<p>A GTFS feed is just a <b>ZIP file of CSV text files</b>. Each file is like a table, and they link to each other by ids:</p>
<table class="data">
<thead><tr><th>File</th><th>What it holds</th><th class="num">Big Blue Bus</th><th class="num">TriMet</th></tr></thead>
<tr><td><code>stops.txt</code></td><td>every stop: id, name, latitude, longitude</td><td class="num">${n(BBB.counts.stops)}</td><td class="num">${n(TRI.counts.stops)}</td></tr>
<tr><td><code>routes.txt</code></td><td>bus or train lines: short name ("7"), long name, type, colour</td><td class="num">${n(BBB.counts.routes)}</td><td class="num">${n(TRI.counts.routes)}</td></tr>
<tr><td><code>trips.txt</code></td><td>one journey of a vehicle along a route, with the <b>service</b> (days) it runs</td><td class="num">${n(BBB.counts.trips)}</td><td class="num">${n(TRI.counts.trips)}</td></tr>
<tr><td><code>stop_times.txt</code></td><td>when each trip arrives at and leaves each stop, in order. This is by far the biggest file</td><td class="num">${n(BBB.counts.stopTimes)}</td><td class="num">${n(TRI.counts.stopTimes)}</td></tr>
<tr><td><code>calendar.txt</code>, <code>calendar_dates.txt</code></td><td>which days each service runs, plus exceptions (holidays)</td><td class="num" colspan="2">${BBB.counts.activeServices} and ${TRI.counts.activeServices} services run on the test day</td></tr>
<tr><td><code>shapes.txt</code>, <code>transfers.txt</code>, fares…</td><td>map lines, transfer rules, prices (optional files)</td><td class="num" colspan="2">not used here</td></tr>
</table>
<p>For example, this real row from TriMet's <code>stop_times.txt</code> says that trip 18188725 leaves stop 12845 (Marquam Hill) at 05:30, and it is the 1st stop of that trip:</p>
<pre>trip_id,arrival_time,departure_time,stop_id,stop_sequence,stop_headsign,...
18188725,05:30:00,05:30:00,12845,1,Marquam Hill,...</pre>
<p>GTFS has a few traps that a trip planner must handle (my tests check all of them):</p>
<ul>
  <li><b>Times can go past 24:00.</b> A bus at 1:10 am that belongs to the evening's service is written <code>25:10:00</code>, so I store times as "seconds since midnight", not as clock times.</li>
  <li><b>Not every trip runs every day.</b> A trip belongs to a <i>service</i>, and the calendar files say which days that service runs. TriMet's file holds 47 services (several schedule periods), and only <b>${n(expT.activeRowShare * 100, 1)}%</b> of its timetable rows run on a given Tuesday. This turned out to matter a lot (section 6).</li>
  <li><b>Loop routes</b> pass the same stop twice, so "the bus from A to B" must pick the right visit to A.</li>
</ul>
<h3>How can GTFS data be used for trip planning?</h3>
<p>Almost every feature of a journey planner is a question about these files:</p>
<ul>
  <li><b>"Which stops are near me?"</b>: a geographic search on <code>stops.txt</code>.</li>
  <li><b>"When is the next bus from this stop?"</b>: <code>stop_times</code> for one stop, sorted by time, keeping only the services that run today.</li>
  <li><b>"Where does this bus go?"</b>: all stop_times of one trip, in order.</li>
  <li><b>"How do I get from A to B?"</b>: trips that pass A and later B (direct), or a first trip to a stop where a second trip continues to B (one change). Walking between nearby stops makes the plan realistic.</li>
  <li>Plus maps (<code>shapes.txt</code>), fares, accessibility (<code>wheelchair_boarding</code>), and live delays from the companion format <b>GTFS-Realtime</b>.</li>
</ul>

<h2>2. Overview of Redis and MongoDB</h2>
<h3>What are they, and how do they differ from SQL databases?</h3>
<p>A traditional SQL database (MySQL, PostgreSQL) stores data in <b>tables with a fixed schema</b>, links them with foreign keys and <b>joins</b>, and is queried with SQL. Redis and MongoDB are both "NoSQL", but they are very different from each other:</p>
<ul>
  <li><b>Redis</b> is an <b>in-memory key-value store</b>. Every piece of data is a value stored under a key, and the value can be a data structure: a string, hash, list, set, <b>sorted set</b>, geo index, stream… There are no tables, no joins and no query language. You call commands like <code>ZRANGE</code> or <code>GEOSEARCH</code> on one key at a time, so <b>you design the keys around the questions you will ask</b>.</li>
  <li><b>MongoDB</b> is a <b>document database</b>. Data is stored as JSON-like documents (BSON) in collections, and documents can have different fields. It has a real <b>query language</b>, secondary indexes, a query planner, and an aggregation pipeline. That makes it the closer of the two to SQL, but without joins by default (<code>$lookup</code> exists) and without a fixed schema.</li>
</ul>
<table class="data">
<thead><tr><th></th><th>Redis ${esc(TRI.versions.redis)}</th><th>MongoDB ${esc(TRI.versions.mongodb)}</th></tr></thead>
<tr><td>Data model</td><td>keys → data structures (hash, sorted set, geo…)</td><td>collections of documents (BSON)</td></tr>
<tr><td>Where data lives</td><td>all in RAM; optional snapshots (RDB) or a log (AOF) on disk</td><td>on disk (WiredTiger, compressed), hot data cached in RAM</td></tr>
<tr><td>Querying</td><td>commands on one key; logic in the application</td><td>query language, indexes chosen by a query planner, aggregation</td></tr>
<tr><td>Geo</td><td><code>GEOADD</code>/<code>GEOSEARCH</code> (a sorted set with geohash scores)</td><td>GeoJSON + <code>2dsphere</code> index, <code>$near</code>, <code>$geoNear</code></td></tr>
<tr><td>Scaling out</td><td>Redis Cluster: 16,384 hash slots spread over nodes; replicas</td><td>replica sets; sharding by a shard key</td></tr>
<tr><td>Typical role</td><td>cache, sessions, leaderboards, queues, real-time counters</td><td>main application database</td></tr>
</table>
<h3>Key features</h3>
<div class="two">
<div><b>Redis</b><ul>
  <li>Very low latency: data in RAM, simple commands, and one main thread that runs commands one by one (so each command is atomic).</li>
  <li>Rich data structures: a <b>sorted set</b> keeps members ordered by a score, which is perfect for "departures ordered by time".</li>
  <li>Built-in geo commands, pipelining (many commands in one round trip), transactions, pub/sub, streams, key expiry (TTL).</li>
  <li>Persistence is optional: RDB snapshots and/or an append-only file.</li>
</ul></div>
<div><b>MongoDB</b><ul>
  <li>Flexible documents: a GTFS row maps naturally to a document, and related data can be embedded.</li>
  <li>Secondary and compound indexes, geo (<code>2dsphere</code>), text, and a <b>query planner</b> that picks the best index.</li>
  <li>Aggregation pipeline (grouping, <code>$geoNear</code>, <code>$lookup</code>), transactions, change streams.</li>
  <li>Durable by default (journal), compressed storage, replication and sharding built in.</li>
</ul></div>
</div>

<h2>3. Benchmarking criteria</h2>
<h3>What I measured, and how</h3>
<table class="data">
<thead><tr><th>Criterion</th><th>How I measured it</th></tr></thead>
<tr><td><b>Correctness</b></td><td>Every one of the ${n(totalChecked(TRI))} test queries per feed ran on both databases and the answers were compared. A fast wrong answer is worthless, so I checked this first. I also wrote 20 tests with known answers (loops, after-midnight times, holidays).</td></tr>
<tr><td><b>Ingestion speed</b></td><td>Time to load the whole feed (and build MongoDB's indexes), median of 3 runs from an empty database.</td></tr>
<tr><td><b>Memory / storage</b></td><td>Redis <code>MEMORY STATS</code>; MongoDB <code>dbStats</code> after an <code>fsync</code> (data size, on-disk size, index size).</td></tr>
<tr><td><b>Query latency</b></td><td>6 trip-planning queries, ${n(TRI.samples)} different realistic inputs each (after 200 warm-up queries), median (p50), 95th and 99th percentiles.</td></tr>
<tr><td><b>Throughput</b></td><td>A realistic mix (35% departure boards, 20% nearby stops, 20% A → B…), ${n(6000)} operations with 1, 8, 32 and 128 users at once.</td></tr>
<tr><td><b>Scalability</b></td><td>The same tests on a small (124K rows) and a large (3.4M rows) real network.</td></tr>
<tr><td><b>Whole application</b></td><td>Time to plan a full journey with my trip planner (about 30 database calls), for 300 random journeys per feed.</td></tr>
<tr><td><b>Ease of use</b></td><td>Code size, what I had to build by hand, and how each database reacted when I changed the data layout.</td></tr>
</table>
<h3>Why benchmark with a real application scenario?</h3>
<p>Generic benchmarks ("how many GET/SET per second") don't tell you how your app will behave, because the speed depends on the <b>data model and the query pattern</b>. My own results show this three times:</p>
<ul>
  <li>The "next departures" query was 3× slower in Redis on the bigger feed. The database was fine; my key design read ${n(1 / expT.activeRowShare, 0)} rows for every useful one. A generic benchmark would never show that (section 6).</li>
  <li>Single queries differ by fractions of a millisecond, but a real trip plan makes about ${APP.trimet.Redis.callsPerPlan.p50} calls, so the gap becomes ${x(APP.trimet.MongoDB.p50, APP.trimet.Redis.p50)} for the whole request.</li>
  <li>Correctness problems (loop routes, holidays) only show up with real data.</li>
</ul>
<p>So I used real feeds, real questions, and compared the answers, not just the speed.</p>

<h2>4. Data ingestion and storage</h2>
<h3>How I ingested GTFS into each database</h3>
<p>The same pipeline feeds both databases, so the comparison is fair: <b>download</b> the ZIP → <b>parse</b> the CSV files as a stream (the TriMet <code>stop_times.txt</code> has 3.4 million lines) → <b>transform</b> (times to seconds, skip invalid stops, copy <code>service_id</code> and <code>route_id</code> next to each stop time) → <b>load</b> in big batches. Parsing took ${secs(TRI.parseMs)} for TriMet and is not counted below.</p>
<div class="two">
<div><b>Redis: keys designed for each question</b>
<pre>stop:{id}         HASH  name, code, lat, lon
stops:geo         GEO   position of every stop
stops:names       ZSET  name words, for search
route:{id}        HASH  short/long name, colour
trip:{id}         HASH  route, service, headsign
trip:{id}:stops   ZSET  score = stop_sequence
dep:{stop_id}     ZSET  score = departure time
                        (member: trip|seq|service|route)</pre>
<p>Loading uses <b>pipelines</b> of 1,000 commands, and one variadic <code>ZADD</code> per sorted set, instead of one command per row.</p></div>
<div><b>MongoDB: collections close to the files</b>
<pre>stops       { _id, name, code, search: [...],
              location: GeoJSON Point }
routes      { _id, short_name, long_name, ... }
trips       { _id, route_id, service_id, ... }
stop_times  { trip_id, stop_id, seq, arr,
              dep, service_id, route_id }
indexes:
  stops       location (2dsphere), search
  stop_times  {stop_id, dep}, {trip_id, seq}</pre>
<p>Loading uses unordered <code>insertMany</code> batches of 10,000, and indexes are built <b>after</b> the load.</p></div>
</div>
<div class="figure"><div class="title">Time to load each feed (median of 3 runs, seconds)</div><div class="sub">Lower is better. MongoDB includes building its 4 indexes (${secs(TRI.ingest.MongoDB.indexMs)} of the ${secs(TRI.ingest.MongoDB.ms)} for TriMet).</div>${ingestChart}</div>
<p>Redis loaded TriMet in <b>${secs(TRI.ingest.Redis.ms)}</b> (${n(TRI.ingest.Redis.rowsPerSec)} stop times per second), MongoDB in <b>${secs(TRI.ingest.MongoDB.ms)}</b>. Turning on Redis's append-only file (so the data survives a restart) only added ${n((TRI.ingest['Redis + AOF'].ms / TRI.ingest.Redis.ms - 1) * 100)}%. Both are fast enough: a GTFS feed changes every few weeks, so loading it is a nightly job, not something users wait for.</p>
<h3>Comparing the storage mechanisms</h3>
<div class="figure"><div class="title">Space used by the TriMet feed (MB)</div><div class="sub">Redis keeps everything in RAM; MongoDB keeps compressed data and indexes on disk and caches the hot part in RAM.</div>${memoryChart}</div>
<ul>
  <li><b>Redis</b> keeps every key in <b>RAM</b>: ${mb(triMem.redis.usedBytes)} for TriMet, about ${n(triMem.redis.usedBytes / TRI.counts.stopTimes)} bytes per stop time (each stop time is stored twice: in its stop's departures and in its trip's stop list). Nothing is on disk unless you turn on RDB or AOF, and even then the disk copy is only for restarting. <b>The whole dataset must fit in memory.</b></li>
  <li><b>MongoDB</b> stores documents in WiredTiger B-trees on disk, <b>compressed</b> (snappy for data, prefix compression for indexes): ${mb(triMem.mongodb.dataBytes)} of documents take ${mb(triMem.mongodb.storageBytes)} on disk, plus ${mb(triMem.mongodb.indexBytes)} of indexes. Only the "working set" needs to be in RAM (its cache defaults to half of the RAM minus 1 GB), so a dataset can be <b>bigger than the memory</b>.</li>
  <li>A MongoDB document carries its field names, so the uncompressed data (${mb(triMem.mongodb.dataBytes)}) is actually bigger than Redis's. Compression on disk is what makes MongoDB the smaller one.</li>
</ul>

<h2>5. Query performance</h2>
<h3>How each database answers trip-planning questions</h3>
<p><b>Redis</b> has no query planner: each question is one or two commands on the keys I designed, and any filtering or combining happens in my Node.js code. <b>Pipelining</b> sends many commands in one network round trip. <b>MongoDB</b> receives a query, and its planner chooses an index, filters and sorts on the server, and returns only the result.</p>
<h3>Typical queries (from my code)</h3>
<div class="two">
<div><b>Next 10 departures from a stop after 08:00</b>
<pre>// Redis: read the stop's sorted set by time,
// skip services that don't run today
ZRANGE dep:13248 28800 +inf BYSCORE LIMIT 0 50

// MongoDB: index { stop_id: 1, dep: 1 }
db.stop_times.find({ stop_id: '13248',
    dep: { $gte: 28800 },
    service_id: { $in: todaysServices } })
  .sort({ dep: 1 }).limit(10)</pre></div>
<div><b>Stops within 500 m of a point</b>
<pre>// Redis: geo search, then 1 pipeline for names
GEOSEARCH stops:geo FROMLONLAT -122.68 45.52
  BYRADIUS 500 m ASC COUNT 10 WITHDIST

// MongoDB: 2dsphere index
db.stops.aggregate([{ $geoNear: {
  near: { type: 'Point',
          coordinates: [-122.68, 45.52] },
  maxDistance: 500, distanceField: 'distance',
  spherical: true } }, { $limit: 10 }])</pre></div>
</div>
<p><b>Direct trips from A to B</b> use the same 2 steps on both: (1) the departures from A in the next 2 hours, (2) for those trips, find B <i>later</i> in the trip: one Redis pipeline of <code>ZRANGEBYSCORE trip:{id}:stops</code>, or one MongoDB query <code>{ trip_id: { $in: [...] }, stop_id: B }</code> using the <code>{trip_id, seq}</code> index. The other queries are a stop by id (<code>HGETALL</code> vs <code>findOne</code>), a trip's stops (<code>ZRANGE</code> vs <code>find().sort({seq})</code>), and a name search ("sawt" finds "OLYMPIC WB &amp; SAWTELLE NS": a <code>BYLEX</code> range in Redis, an anchored regex on an indexed array in MongoDB).</p>
<h3>Are the answers the same?</h3>
<table class="data">
<thead><tr><th>Feed</th>${Object.keys(Q).map((q) => `<th class="num">${Q[q]}</th>`).join('')}</tr></thead>
<tr><td>Big Blue Bus</td>${correctnessRows(BBB)}</tr>
<tr><td>TriMet</td>${correctnessRows(TRI)}</tr>
</table>
<p>Out of ${n(totalChecked(BBB) + totalChecked(TRI))} compared queries, <b>${totalDifferent(BBB) + totalDifferent(TRI)} were different</b>. The ones marked * are equivalent but not identical: two stops at almost the same distance came back in a different order (Redis stores positions as 52-bit geohashes and uses a slightly different Earth radius, so distances differ by a few centimetres), or two buses leaving in the same minute were listed in a different order. While building the benchmark, the comparison also caught a real bug in my first version: on loop routes, Redis listed the same bus twice and MongoDB could pick the wrong visit. I fixed it in both before measuring.</p>
<div class="figure"><div class="title">Median query time on TriMet (ms)</div><div class="sub">Lower is better. ${n(TRI.samples)} different inputs per query and database, after warm-up.</div>${latencyChart(TRI)}</div>
${latencyTable}
<ul>
  <li><b>Redis was ${x(ratioAll, 1)} faster on average</b> for the simple lookups (stop, nearby, trip, departures, A → B), and its 95th percentiles for those queries were at most ${ms(Math.max(...['stop', 'nearby', 'trip', 'departures', 'direct'].map((q) => lat(TRI, q, 'Redis', 'p95'))))} ms.</li>
  <li><b>Name search was the closest race:</b> MongoDB won on the small feed (${ms(lat(BBB, 'search', 'MongoDB'))} vs ${ms(lat(BBB, 'search', 'Redis'))} ms), Redis on TriMet (${ms(lat(TRI, 'search', 'Redis'))} vs ${ms(lat(TRI, 'search', 'MongoDB'))} ms), and the 95th percentiles were the same (about ${ms(lat(TRI, 'search', 'Redis', 'p95'))} ms). For short prefixes like "stat" both fetch up to 1,000 matches and sort them, so that work, not the database, dominates.</li>
  <li>The <b>median of every query was under a millisecond</b> on both databases. For a single request, the user would never notice the difference; it matters when there are many calls per request or many users (next sections).</li>
</ul>

<h2>6. Scalability and efficiency</h2>
<h3>From a small to a large network</h3>
<table class="data">
<thead><tr><th></th><th class="num">Big Blue Bus</th><th class="num">TriMet</th><th class="num">Growth</th></tr></thead>
<tr><td>Stop times</td><td class="num">${n(BBB.counts.stopTimes)}</td><td class="num">${n(TRI.counts.stopTimes)}</td><td class="num">${x(TRI.counts.stopTimes, BBB.counts.stopTimes)}</td></tr>
<tr><td>Redis load time / RAM</td><td class="num">${secs(BBB.ingest.Redis.ms)} / ${mb(BBB.memory.redis.usedBytes)}</td><td class="num">${secs(TRI.ingest.Redis.ms)} / ${mb(TRI.memory.redis.usedBytes)}</td><td class="num">${x(TRI.ingest.Redis.ms, BBB.ingest.Redis.ms)} / ${x(TRI.memory.redis.usedBytes, BBB.memory.redis.usedBytes)}</td></tr>
<tr><td>MongoDB load time / disk</td><td class="num">${secs(BBB.ingest.MongoDB.ms)} / ${mb(mongoDisk(BBB.memory))}</td><td class="num">${secs(TRI.ingest.MongoDB.ms)} / ${mb(mongoDisk(TRI.memory))}</td><td class="num">${x(TRI.ingest.MongoDB.ms, BBB.ingest.MongoDB.ms)} / ${x(mongoDisk(TRI.memory), mongoDisk(BBB.memory))}</td></tr>
${['stop', 'nearby', 'trip', 'departures', 'direct']
  .map((q) => `<tr><td>${Q[q]}, median (Redis / MongoDB)</td><td class="num">${ms(lat(BBB, q, 'Redis'))} / ${ms(lat(BBB, q, 'MongoDB'))} ms</td><td class="num">${ms(lat(TRI, q, 'Redis'))} / ${ms(lat(TRI, q, 'MongoDB'))} ms</td><td class="num">${x(lat(TRI, q, 'Redis'), lat(BBB, q, 'Redis'))} / ${x(lat(TRI, q, 'MongoDB'), lat(BBB, q, 'MongoDB'))}</td></tr>`)
  .join('')}
</table>
<p>Load time and space grew roughly in line with the data (both are linear). Thanks to indexes and key lookups, <b>most queries barely slowed down</b> with 28 times more data, on both databases: they read a few entries whatever the size. The exception was <b>next departures in Redis: ${x(lat(TRI, 'departures', 'Redis'), lat(BBB, 'departures', 'Redis'))} slower</b>.</p>
<h3>The surprise: data layout matters more than the database</h3>
<p>I looked into it. In TriMet's file only ${n(expT.activeRowShare * 100, 1)}% of the timetable rows run on a given day, so my <code>dep:{stop}</code> sorted set mixes today's departures with those of 40 other service periods. To return 10 departures, Redis read them in chunks and skipped about 9 out of 10 in my code, with several round trips. MongoDB did the same filtering inside the server, in one round trip, which is why it slowed down less. I tried a <b>service-aware layout</b> on both: Redis keys <code>dep:{stop}:{service}</code> (read the running services in one pipeline and merge), and a MongoDB index <code>{stop_id, service_id, dep}</code>.</p>
<div class="figure"><div class="title">Next departures on TriMet, median (ms)</div><div class="sub">Same ${n(2000)} queries, same answers (checked).</div>${expChart}</div>
<ul>
  <li>Redis: <b>${ms(L['Redis, normal layout'].p50)} → ${ms(L['Redis, service-aware'].p50)} ms</b> (${x(L['Redis, normal layout'].p50, L['Redis, service-aware'].p50)} faster; 95th percentile ${ms(L['Redis, normal layout'].p95)} → ${ms(L['Redis, service-aware'].p95)} ms), back to the small-feed speed. Cost: ${n(expT.cost.redisExtraKeys)} more keys and ${mb(expT.cost.redisExtraBytes)} more RAM when both layouts are kept.</li>
  <li>MongoDB: <b>${ms(L['MongoDB, normal index'].p50)} → ${ms(L['MongoDB, service-aware index'].p50)} ms</b>. <code>explain()</code> on the busiest stop shows why: ${expT.explain.normal.keysExamined} index entries read to return 10 before, ${expT.explain.serviceAware.keysExamined} after. Cost: ${mb(expT.cost.mongoExtraIndexBytes)} of index.</li>
  <li><b>Ease of use:</b> once the index existed, MongoDB's query planner <b>chose it by itself</b>, with no code change (my first measurement was wrong because of this, and I had to force the old index to compare). In Redis I had to change both the keys and the query code.</li>
</ul>
<h3>Throughput: many users at once</h3>
<div class="figure"><div class="title">Operations per second with 1 to 128 users at the same time</div><div class="sub">Higher is better. Realistic mix of trip-planning queries; client and database on the same laptop.</div>${legend(SERIES)}<div class="two">${tpChart(BBB, 'Big Blue Bus')}${tpChart(TRI, 'TriMet')}</div></div>
${throughputTable}
<p>Redis handled about <b>${x(peak(TRI.throughput.Redis).opsPerSec, peak(TRI.throughput.MongoDB).opsPerSec)}</b> the peak throughput of MongoDB on TriMet and kept lower tail latency. Both flatten after about 8–32 users: here the benchmark client (one Node.js process on the same 11-core laptop) and Redis's single command thread become the limit. With 128 users, MongoDB's throughput dropped and its 95th percentile rose to ${ms(TRI.throughput.MongoDB.at(-1).p95)} ms, against ${ms(TRI.throughput.Redis.at(-1).p95)} ms for Redis.</p>
<h3>Scaling beyond one machine</h3>
<ul>
  <li><b>Redis</b> scales reads with replicas and data with <b>Redis Cluster</b>, which splits keys into 16,384 hash slots across nodes. Commands that touch several keys must keep them in the same slot (hash tags like <code>{stop:13248}</code>), which constrains the key design. The real limit is <b>RAM</b>: TriMet alone needs ${mb(triMem.redis.usedBytes)}; a country with hundreds of feeds, plus several timetable versions and history, would need tens of gigabytes of RAM, which is expensive. Without AOF, a crash loses every write since the last snapshot.</li>
  <li><b>MongoDB</b> scales reads with replica sets and data with <b>sharding</b>: for GTFS, a shard key like <code>{ feed_id, stop_id }</code> keeps one agency's stops together. Data lives on disk compressed, only hot data needs RAM, writes are durable, and new query patterns only need a new index.</li>
</ul>
<div class="answer"><b>My recommendation for a large-scale trip planner: MongoDB as the main database, with Redis as a cache.</b> MongoDB holds the full timetable for all agencies (it is cheaper, durable, flexible and shards naturally by agency). Redis keeps the <i>hot</i> answers: departure boards of busy stops, recent plans, and live GTFS-Realtime delays, with an expiry time. Popular requests then get Redis speed, while the bulk of the data does not have to live in RAM. (Many production planners, such as OpenTripPlanner, go further and build an in-memory graph of the network inside the application; the database is then mainly for storage and the serving layer.)</div>

<h2 class="pagebreak">7. Practical application: a simple trip planner</h2>
<p>I built a small web app in <code>app/</code>, with Express and plain HTML/JavaScript. It runs on <b>either</b> database (<code>npm run app</code> or <code>DB=redis npm run app</code>), because the planner only calls the store methods I benchmarked. I made <b>MongoDB the default</b>, following my recommendation.</p>
<div class="shots">
  <img class="shot" src="../screenshots/planner-mongodb.png" alt="Trip planner on MongoDB: Downtown Santa Monica to UCLA with one change and a short walk">
  <img class="shot" src="../screenshots/planner-mobile-dark.png" alt="Trip planner on a phone in dark mode, running on Redis">
</div>
<p class="muted">Top of the page only. Left: Downtown Santa Monica → UCLA Faculty Center on MongoDB: route 7, walk 53 m around the corner, route 17. Right: the same app on Redis, on a phone in dark mode. Route badges use the colours from <code>routes.txt</code>.</p>
<h3>How I implemented it (step by step)</h3>
<ol>
  <li><b>Load the data:</b> download the GTFS ZIP (<code>npm run data</code>), parse it as a stream, load it into the database with the layout from section 4, and build the indexes.</li>
  <li><b>Service calendar:</b> for the chosen date, work out which services run (calendar + exceptions). This is tiny, so it stays in the app's memory.</li>
  <li><b>API</b> (Express): <code>/api/stops/search?q=</code> (autocomplete), <code>/api/stops/near?lat=&amp;lon=</code>, <code>/api/departures/:stop?date=&amp;time=</code>, <code>/api/plan?from=&amp;to=&amp;date=&amp;time=</code>. It validates the input and answers 400 or 404 with a clear message.</li>
  <li><b>Planner:</b> (1) direct buses from A to B; (2) if there are fewer than 3: walk from A to a stop within 250 m, or take a bus to a stop where a second bus continues to B, changing at the same stop or a nearby one (the geo query). It allows at least 2 minutes to change (more if walking, at 1.2 m/s), keeps only journeys that no other journey beats (leaves later <i>and</i> arrives earlier), and never suggests walking to catch a bus that also stops at A.</li>
  <li><b>Front-end:</b> two stop pickers with autocomplete, a date and time, journey cards and a live departure board.</li>
  <li><b>Tests:</b> 20 automated tests on a handmade feed with known answers (loops, 25:10 times, a holiday that cancels the weekday service), run on <b>both</b> databases, plus API tests.</li>
</ol>
<div class="figure"><div class="title">Time to plan a whole journey with the app (ms)</div><div class="sub">300 random journeys per feed, same answers from both databases; about ${APP.trimet.Redis.callsPerPlan.p50} database calls per plan.</div>${appChart}</div>
<p>This is the most "application-based" result: because one plan makes about ${APP.trimet.Redis.callsPerPlan.p50} small calls, the per-call difference adds up to <b>${x(APP.trimet.MongoDB.p50, APP.trimet.Redis.p50)} at the median and ${x(APP.trimet.MongoDB.p95, APP.trimet.Redis.p95)} at the 95th percentile on TriMet</b>. Still, ${ms(APP.trimet.MongoDB.p50)} ms is fast for a web request. Both databases gave the same journeys for all ${APP.trimet.plans * 2} plans, except the walking distance shown (a metre of rounding) in ${APP.bigbluebus.sameIgnoringMetres + APP.trimet.sameIgnoringMetres} of them. Many random pairs had no journey (${APP.trimet.plans - APP.trimet.Redis.found} of 300 on TriMet), because my simple planner allows at most one change. A real planner would use an algorithm like RAPTOR for any number of changes.</p>

<h2>8. Conclusion</h2>
<table class="data">
<thead><tr><th></th><th>Redis</th><th>MongoDB</th></tr></thead>
<tr><td><b>Advantages</b></td><td>
  <ul><li>Fastest queries (${x(ratioAll, 1)} on average here) and best tail latency</li><li>About ${x(peak(TRI.throughput.Redis).opsPerSec, peak(TRI.throughput.MongoDB).opsPerSec)} the throughput</li><li>Fastest loading</li><li>Sorted sets and geo commands fit timetables very well</li><li>Great for caching and real-time data (live delays, expiry)</li></ul></td>
<td><ul><li>Data larger than RAM; ${mb(mongoDisk(triMem))} on disk vs ${mb(triMem.redis.usedBytes)} of RAM for TriMet</li><li>Durable by default; sharding and replica sets built in</li><li>Query language, server-side filtering, a planner that picks indexes</li><li>New questions need a new index, not a new data layout</li><li>Documents map naturally to GTFS rows</li></ul></td></tr>
<tr><td><b>Disadvantages</b></td><td>
  <ul><li>Everything must fit in (expensive) RAM</li><li>Every query designed by hand: the keys are the indexes (${codeLines('redis-store.js')} lines of code vs ${codeLines('mongo-store.js')})</li><li>Filtering happens in the app: a wrong layout was 3× slower</li><li>Durability needs AOF; Cluster limits multi-key commands</li></ul></td>
<td><ul><li>Slower per query (medians still under 1 ms here)</li><li>Many small calls per request add up (${x(APP.trimet.MongoDB.p50, APP.trimet.Redis.p50)} for a full plan)</li><li>Lower throughput and higher tail latency under heavy load</li><li>Uncompressed documents are big (field names)</li></ul></td></tr>
</table>
<div class="answer"><b>Which would I choose for future GTFS projects?</b> <b>MongoDB as the main database</b>, and Redis only when the measurements show I need it. In my benchmark MongoDB answered every trip-planning question correctly, with a median time under a millisecond, handled the 28× bigger network with little slowdown (except the departures layout I then fixed), and needed only ${n(mongoDisk(triMem) / triMem.redis.usedBytes * 100)}% of the space Redis needed. It also made my life easier: I could add a new query with an index, and the planner adopted the better index on its own. Redis was clearly faster, and that speed matters for a busy service where one request makes dozens of calls. So for a large deployment I would add Redis as a cache for departure boards and live data, not as the only store, because keeping every agency's full timetable in RAM is costly and fragile.</div>
<div class="note-box"><b>Limits of this benchmark.</b> Both databases and the client ran on one laptop (${esc(TRI.machine.cpu)}, ${TRI.machine.ramGB} GB RAM), so there was no network latency. In production, every call would also pay a network round trip, which would increase the gap for many-call requests. The data always fitted in RAM, which favours both; MongoDB's advantage when the data is larger than RAM was not tested. Each database ran as a single server with default settings, not a cluster. My data models are reasonable but not the only possible ones, as section 6 shows. Agencies publish new feeds every few months, so a re-run will give slightly different numbers.</div>

<h2>Sources</h2>
<ul class="src">
  <li>GTFS Schedule reference (gtfs.org): https://gtfs.org/documentation/schedule/reference/</li>
  <li>Big Blue Bus GTFS feed: https://gtfs.bigbluebus.com/current.zip · TriMet developer resources and GTFS: https://developer.trimet.org/</li>
  <li>Redis sorted sets: https://redis.io/docs/latest/develop/data-types/sorted-sets/ · geospatial: https://redis.io/docs/latest/develop/data-types/geospatial/</li>
  <li>Redis persistence (RDB and AOF): https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/ · scaling with Redis Cluster: https://redis.io/docs/latest/operate/oss_and_stack/management/scaling/</li>
  <li>MongoDB geospatial queries: https://www.mongodb.com/docs/manual/geospatial-queries/ · WiredTiger storage engine: https://www.mongodb.com/docs/manual/core/wiredtiger/ · sharding: https://www.mongodb.com/docs/manual/sharding/</li>
  <li>OpenTripPlanner: https://www.opentripplanner.org/</li>
</ul>
<footer>Measured with Redis ${esc(TRI.versions.redis)} and MongoDB ${esc(TRI.versions.mongodb)} (temporary local servers), Node ${esc(TRI.machine.node)}, travel date Tuesday 10 November 2026. Code, raw results and tests: <code>gtfs-redis-mongodb-benchmark/</code> (<code>npm run bench</code>, <code>npm test</code>, <code>npm run app</code>).</footer>
</body></html>`;

fs.writeFileSync(path.join(__dirname, 'report.html'), html);
console.log('wrote report/report.html');
