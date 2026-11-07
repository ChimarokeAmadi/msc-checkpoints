// Builds report/report.html from the measured results in dloader/results.json.
// Run the demo first (npm run migrate), then: npm run report

const fs = require('fs');
const path = require('path');

const AUTHOR = 'Chimaroke Amadi';
const R = require('../dloader/results.json');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const n = (x) => Number(x).toLocaleString('en-US');
const ok = (b) => (b ? '<span class="good">✔ match</span>' : '<span class="bad">✘ mismatch</span>');
const fmt = (v) => (typeof v === 'object' ? Object.entries(v).map(([k, x]) => `${k}: ${n(x)}`).join(', ') : n(v));
const kb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const src = R.source;
const mig = R.migration;
const totalDocs = src.departments + src.instructors + src.courses + src.students;
const totalRows = totalDocs + src.enrollments;
const bestBatch = R.batchSizes.reduce((a, b) => (b.perSecond > a.perSecond ? b : a));
const one = R.batchSizes.find((b) => b.batchSize === 1);
const statBefore = R.statistics.before.find((s) => s.ids === 1000);
const statAfter = R.statistics.after.find((s) => s.ids === 1000);
const stat100b = R.statistics.before.find((s) => s.ids === 100);
const stat100a = R.statistics.after.find((s) => s.ids === 100);

// ---- The worked example: one student, before (SQL rows) and after (document)
const ex = R.example;
const sqlStudentTable = `<table class="mini"><caption>MySQL: 1 row in <code>students</code></caption>
  <tr>${Object.keys(ex.sqlStudent).map((k) => `<th>${k}</th>`).join('')}</tr>
  <tr>${Object.values(ex.sqlStudent).map((v) => `<td>${esc(JSON.stringify(v))}</td>`).join('')}</tr></table>`;
const sqlEnrollTable = `<table class="mini"><caption>+ ${ex.sqlEnrollments.length} rows in <code>enrollments</code></caption>
  <tr>${Object.keys(ex.sqlEnrollments[0] || {}).map((k) => `<th>${k}</th>`).join('')}</tr>
  ${ex.sqlEnrollments.map((r) => `<tr>${Object.values(r).map((v) => `<td>${v === null ? '<i>NULL</i>' : esc(v)}</td>`).join('')}</tr>`).join('')}</table>`;
const mongoDoc = esc(
  JSON.stringify(ex.mongoStudent, null, 2)
    .replace(/"(\w+)":/g, '$1:')
    .replace(/(\d{4}-\d{2}-\d{2})T00:00:00\.000Z/g, '$1'),
).replace(/enrolled_on: &quot;([\d-]+)&quot;/g, 'enrolled_on: ISODate("$1")')
  .replace(/enrolled_on: "([\d-]+)"/g, 'enrolled_on: ISODate("$1")');

// ---- Bar chart: throughput by batch size (single series, one hue)
function batchChart() {
  const data = R.batchSizes;
  const W = 640, H = 230, left = 70, right = 20, top = 18, bottom = 46;
  const max = Math.ceil(Math.max(...data.map((d) => d.perSecond)) / 10000) * 10000;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const band = plotW / data.length;
  const barW = Math.min(46, band * 0.5);
  const y = (v) => top + plotH - (v / max) * plotH;
  const ticks = [0, max / 4, max / 2, (3 * max) / 4, max];
  const bars = data
    .map((d, i) => {
      const x = left + i * band + (band - barW) / 2;
      const h = (d.perSecond / max) * plotH;
      const yTop = top + plotH - h;
      // rounded top only (4px), anchored flat on the baseline
      const r = Math.min(4, h);
      return `<path d="M${x},${top + plotH} V${yTop + r} Q${x},${yTop} ${x + r},${yTop} H${x + barW - r} Q${x + barW},${yTop} ${x + barW},${yTop + r} V${top + plotH} Z" fill="#2563eb"/>
        <text x="${x + barW / 2}" y="${yTop - 6}" text-anchor="middle" class="val">${n(d.perSecond)}</text>
        <text x="${x + barW / 2}" y="${top + plotH + 18}" text-anchor="middle" class="tick">${n(d.batchSize)}</text>`;
    })
    .join('');
  return `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="Students migrated per second by batch size">
    ${ticks.map((t) => `<line x1="${left}" x2="${W - right}" y1="${y(t)}" y2="${y(t)}" stroke="#e2e8f0" stroke-width="1"/>
      <text x="${left - 8}" y="${y(t) + 4}" text-anchor="end" class="tick">${n(t)}</text>`).join('')}
    ${bars}
    <line x1="${left}" x2="${W - right}" y1="${top + plotH}" y2="${top + plotH}" stroke="#94a3b8"/>
    <text x="${left + plotW / 2}" y="${H - 6}" text-anchor="middle" class="axis">batch size (rows per round trip)</text>
    <text transform="translate(14 ${top + plotH / 2}) rotate(-90)" text-anchor="middle" class="axis">students / second</text>
  </svg>`;
}

// ---- Diagram: the mapping from tables to collections
function mappingDiagram() {
  const box = (x, y, w, title, lines, fill) => `
    <g transform="translate(${x},${y})">
      <rect width="${w}" height="${22 + lines.length * 15}" rx="7" fill="${fill}" stroke="#334155"/>
      <text x="${w / 2}" y="16" text-anchor="middle" class="bt">${title}</text>
      ${lines.map((l, i) => `<text x="10" y="${33 + i * 15}" class="bl">${l}</text>`).join('')}
    </g>`;
  const arrow = (x1, y1, x2, y2) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#2563eb" stroke-width="1.6" marker-end="url(#ah)"/>`;
  return `<svg viewBox="0 0 700 300" class="diagram" role="img" aria-label="Mapping of MySQL tables to MongoDB collections">
    <defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#2563eb"/></marker></defs>
    <text x="110" y="14" text-anchor="middle" class="h">MySQL (${n(totalRows)} rows)</text>
    <text x="560" y="14" text-anchor="middle" class="h">MongoDB (${n(totalDocs)} documents)</text>
    ${box(20, 26, 180, `departments (${src.departments})`, ['department_id PK', 'name'], '#eff6ff')}
    ${box(20, 82, 180, `instructors (${src.instructors})`, ['instructor_id PK', 'department_id FK'], '#eff6ff')}
    ${box(20, 138, 180, `courses (${src.courses})`, ['course_id PK', 'instructor_id FK'], '#eff6ff')}
    ${box(20, 194, 180, `students (${n(src.students)})`, ['student_id PK', 'email, age'], '#eff6ff')}
    ${box(20, 250, 180, `enrollments (${n(src.enrollments)})`, ['(student_id, course_id) PK'], '#eff6ff')}
    ${box(430, 26, 260, 'departments', ['{ _id, name }'], '#f0fdf4')}
    ${box(430, 82, 260, 'instructors', ['{ _id, …, department: { id, name } }'], '#f0fdf4')}
    ${box(430, 138, 260, 'courses', ['{ _id, …, instructor: { id, full_name } }'], '#f0fdf4')}
    ${box(430, 194, 260, 'students', ['{ _id, …, enrollments: [', '    { course_id, course_title,', '      grade?, enrolled_on } ] }'], '#f0fdf4')}
    ${arrow(200, 50, 428, 50)}
    ${arrow(200, 106, 428, 106)}
    ${arrow(200, 162, 428, 162)}
    ${arrow(200, 218, 428, 218)}
    ${arrow(200, 270, 428, 236)}
    <text x="314" y="44" text-anchor="middle" class="note">1 row → 1 doc</text>
    <text x="314" y="100" text-anchor="middle" class="note">+ join: department name copied in</text>
    <text x="314" y="156" text-anchor="middle" class="note">+ join: instructor name copied in</text>
    <text x="314" y="212" text-anchor="middle" class="note">student + their enrollments</text>
    <text x="314" y="268" text-anchor="middle" class="note">join table → embedded array</text>
  </svg>`;
}

const failed = R.faultInjection.failedChecks;

const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>SQL to NoSQL Migration with DLoader</title>
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif; color: #1e293b; font-size: 10.3pt; line-height: 1.5; margin: 0; }
  h1 { font-size: 21pt; margin: 0 0 4px; color: #0f172a; }
  h2 { font-size: 14.5pt; margin: 24px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #2563eb; color: #1e3a8a; break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 16px 0 6px; color: #0f172a; break-after: avoid; }
  p { margin: 6px 0; } ul, ol { margin: 6px 0; padding-left: 22px; } li { margin: 2px 0; }
  .meta { color: #64748b; margin-bottom: 12px; }
  .lead { background: #eff6ff; border-left: 4px solid #2563eb; padding: 9px 13px; border-radius: 4px; }
  .note-box { background: #fffbeb; border-left: 4px solid #d97706; padding: 9px 13px; border-radius: 4px; margin: 10px 0; break-inside: avoid; }
  .answer { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 8px 13px; border-radius: 4px; margin: 10px 0; break-inside: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 9pt; break-inside: avoid; }
  caption { text-align: left; font-weight: 600; margin-bottom: 4px; color: #334155; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 7px; vertical-align: top; text-align: left; }
  th { background: #f1f5f9; }
  td.num, th.num { text-align: right; white-space: nowrap; }
  table.checks { table-layout: fixed; } table.checks td.num { white-space: normal; }
  table.mini { font-size: 7.8pt; width: auto; } table.mini td, table.mini th { padding: 2px 5px; }
  .good { color: #15803d; font-weight: 600; } .bad { color: #b91c1c; font-weight: 600; }
  code, pre { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 8.4pt; }
  code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; }
  pre { background: #0f172a; color: #e2e8f0; padding: 9px 11px; border-radius: 6px; white-space: pre-wrap; break-inside: avoid; margin: 6px 0; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
  .diagram, .chart { width: 100%; height: auto; display: block; margin: 6px auto; break-inside: avoid; }
  .chart { width: 85%; }
  .diagram .h { font: 700 12px sans-serif; fill: #0f172a; } .diagram .bt { font: 700 11px sans-serif; fill: #0f172a; }
  .diagram .bl { font: 10px monospace; fill: #334155; } .diagram .note { font: italic 9.5px sans-serif; fill: #1d4ed8; }
  .chart .tick { font: 10px sans-serif; fill: #64748b; } .chart .val { font: 600 10px sans-serif; fill: #334155; } .chart .axis { font: 10.5px sans-serif; fill: #475569; }
  .src { font-size: 8.6pt; color: #475569; } .src li { margin: 3px 0; overflow-wrap: anywhere; }
  .pagebreak { break-before: page; }
  footer { margin-top: 18px; color: #64748b; font-size: 8.5pt; border-top: 1px solid #e2e8f0; padding-top: 6px; }
</style></head><body>

<h1>Migrating Data from SQL to NoSQL with DLoader</h1>
<div class="meta">${AUTHOR} · GoMyCode MSC checkpoint · ${new Date(R.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>

<p class="lead">To understand the topic properly, I did more than research it. I <b>built a small DLoader-style pipeline</b> and used it to migrate a real
MySQL ${esc(R.versions.mysql)} database (${n(totalRows)} rows) into MongoDB ${esc(R.versions.mongodb)}. I then <b>checked</b> that nothing was lost
and measured what makes it fast or slow. Every number in this report comes from that run (<code>dloader/run.js</code>).</p>

<div class="note-box"><b>What I could and couldn't verify about DLoader.</b> DLoader is not a commercial product. It comes from a research paper:
<i>"DLoader: Migration of Data from SQL to NoSQL Databases"</i> by K. Rajaram, P. Sharma and S. Selvakumar, published in the Springer
<i>Proceedings of the International Conference on Cognitive and Intelligent Computing</i> (2023, pp. 193–204). The full text is behind a paywall, and I found
no public download or source code for the tool. So in this report, statements marked <b>(paper)</b> come from what is publicly known about the paper.
Everything else is general migration practice, which I tested with my own implementation of the same three stages.</div>

<h2>1. Introduction to Data Migration</h2>
<h3>What is data migration, and why is it important?</h3>
<p><b>Data migration</b> means moving data from one storage system to another, here from a relational (SQL) database to a NoSQL database. It usually
also involves changing the <i>shape</i> of the data, because the two systems organize it differently. Companies migrate when their needs change:
more traffic than one server can handle, data that no longer fits a fixed schema, the need to spread data across regions, or lower costs.</p>
<p>It matters because data is often a company's most valuable asset, and a migration is one of the riskiest moments in its life. A bad migration can
<b>lose records, corrupt values, break relationships or cause downtime</b>, and it might not be noticed until much later. A good migration is planned,
repeatable and verified.</p>

<h3>Key differences between SQL and NoSQL databases</h3>
<table>
<thead><tr><th></th><th>SQL (relational: MySQL, PostgreSQL…)</th><th>NoSQL (MongoDB, Cassandra, Redis…)</th></tr></thead>
<tbody>
<tr><td><b>Data model</b></td><td>Tables of rows and columns</td><td>Documents (JSON-like), key-value pairs, wide columns or graphs</td></tr>
<tr><td><b>Schema</b></td><td>Fixed and declared up front (<code>CREATE TABLE</code>)</td><td>Flexible: documents in one collection can have different fields</td></tr>
<tr><td><b>Relationships</b></td><td>Foreign keys + <code>JOIN</code> at query time</td><td>Usually <b>embedded</b> in the document or duplicated, and joins are limited or expensive</td></tr>
<tr><td><b>Design starts from…</b></td><td>The data itself (normalize to avoid repetition)</td><td>The <b>queries</b> the application will run</td></tr>
<tr><td><b>Scaling</b></td><td>Mostly vertical (a bigger server)</td><td>Built to scale horizontally (more servers, sharding)</td></tr>
<tr><td><b>Consistency</b></td><td>Strong ACID transactions</td><td>Often eventual or tunable consistency. MongoDB supports multi-document ACID transactions, but they cost more</td></tr>
<tr><td><b>Query language</b></td><td>Standard SQL</td><td>Specific to each database (MongoDB query API, CQL…)</td></tr>
</tbody></table>

<h2>2. Overview of DLoader</h2>
<h3>What is DLoader, and what role does it play?</h3>
<p>DLoader is a <b>migration framework for moving data from a MySQL database into NoSQL databases</b>, specifically <b>MongoDB</b> (document store) and
<b>Cassandra</b> (wide-column store) <b>(paper)</b>. It plays the role of the <b>ETL tool</b> in the migration: it Extracts the data from the source,
Transforms it into the target's model, and Loads it. That way the migration is done by a repeatable program and not by hand.</p>

<h3>Main features and capabilities</h3>
<ul>
  <li><b>Extraction</b> of the data from a MySQL database <b>(paper)</b>.</li>
  <li><b>Preprocessing</b>: applying transformations and standardizations to the data before it is loaded <b>(paper)</b>.</li>
  <li><b>Column mapping</b>: mapping the MySQL table columns to fields in the NoSQL database <b>(paper)</b>.</li>
  <li><b>Two kinds of target</b>: a document database (MongoDB) and a wide-column database (Cassandra), which lets the authors compare them. They report that
  in their experiments, Cassandra needed less storage space and performed better than the transformed MongoDB database <b>(paper)</b>.</li>
</ul>
<p>To actually <i>work</i>, a tool built on these stages also needs the capabilities below. I included all of them in my implementation, and the rest of
this report tests them: reading in batches, a consistent snapshot of the source, idempotent loading (safe to re-run), indexes, and validation.</p>

<h2>3. The Migration Process</h2>
<h3>Steps to migrate from SQL to NoSQL with DLoader</h3>
<ol>
  <li><b>Assess the source.</b> List the tables, row counts, keys, relationships and data quality problems, and find out <i>how the application reads the data</i>.</li>
  <li><b>Design the target model.</b> Decide for each table whether it becomes its own collection, gets <b>embedded</b> in another document, or is <b>referenced</b> by id.
  This is the most important step, because a NoSQL model is designed around the queries.</li>
  <li><b>Configure the mapping.</b> Write the column → field rules, the type conversions and the cleaning rules (DLoader's mapping and preprocessing stages).</li>
  <li><b>Extract</b> the rows from MySQL in batches, from one consistent snapshot.</li>
  <li><b>Transform</b> each batch: clean values, convert types, and combine related rows into documents.</li>
  <li><b>Load</b> the documents into the NoSQL database in bulk, then create the indexes.</li>
  <li><b>Validate</b>: compare counts, checksums and samples between source and target.</li>
  <li><b>Cut over</b>: switch the application to the new database, keep the old one read-only for a while, and have a rollback plan.</li>
</ol>

<h3>Common challenges and how to address them</h3>
<table>
<thead><tr><th>Challenge</th><th>How to address it</th></tr></thead>
<tbody>
<tr><td><b>Different data models</b>: SQL relies on joins, which NoSQL doesn't do well</td><td>Redesign around the queries: embed data that is read together, reference data that is large or shared (section 4)</td></tr>
<tr><td><b>Data types</b> that don't exist on the other side (DECIMAL, TINYINT(1) booleans, DATE, ENUM)</td><td>An explicit type-mapping table in the transform step, tested on real data</td></tr>
<tr><td><b>Dirty data</b>: spaces, inconsistent case, invalid values</td><td>Standardize during preprocessing (my pipeline trims and lowercases emails, for example)</td></tr>
<tr><td><b>The source keeps changing during the migration</b></td><td>Read from a consistent snapshot, then catch up the changes (or briefly freeze writes, or use change-data-capture)</td></tr>
<tr><td><b>Lost integrity</b>: no foreign keys in NoSQL</td><td>Check references during validation, and enforce rules in the application or with schema validation</td></tr>
<tr><td><b>Large volumes</b> and slow migrations</td><td>Batching, bulk writes, indexes after the load, parallel workers (section 5)</td></tr>
<tr><td><b>Failures halfway through</b></td><td>Make loading <b>idempotent</b> (upsert by the original key), so the migration can simply be re-run</td></tr>
<tr><td><b>Application changes</b>: every query has to be rewritten</td><td>Plan it as part of the project, and run old and new side by side before switching</td></tr>
</tbody></table>

<h2>4. Data Transformation</h2>
<h3>How DLoader handles transformation</h3>
<p>DLoader handles it in its <b>preprocessing</b> stage, where it applies transformations and standardizations, and its <b>mapping</b> stage, where MySQL columns become
NoSQL fields <b>(paper)</b>. In practice the transformation does three jobs: <b>clean</b> the values, <b>convert</b> the types, and <b>restructure</b> rows from several tables into
documents. Here is the mapping I designed for the university database:</p>
${mappingDiagram()}

<h3>Example: one student before and after</h3>
<div class="two">
<div>${sqlStudentTable}${sqlEnrollTable}</div>
<div><pre>// MongoDB: 1 document in "students"
${mongoDoc}</pre></div>
</div>
<p>Look at what changed: the <b>${ex.sqlEnrollments.length} enrollment rows were embedded</b> inside the student, along with the course title, so showing a student's courses needs no join.
The messy email <code>${esc(JSON.stringify(ex.sqlStudent.email))}</code> was <b>trimmed and lowercased</b>, the dates became real <b>Date</b> values, and the
<b>NULL grade was left out</b> of the document instead of being stored as <code>null</code>.</p>

<h3>Other common transformations</h3>
<table>
<thead><tr><th>In SQL</th><th>In NoSQL (MongoDB)</th><th>Why</th></tr></thead>
<tbody>
<tr><td>Join table (<code>enrollments</code>)</td><td>Array embedded in the parent document</td><td>Read together. Fine as long as the array stays small (bounded)</td></tr>
<tr><td>Foreign key to a small lookup table</td><td>Copy the needed fields in (<code>department: { id, name }</code>)</td><td>Avoids a join on every read. Costs an update in several places if the name changes</td></tr>
<tr><td>Foreign key to a big or shared entity</td><td>Keep a reference (<code>course_id</code>)</td><td>Embedding a whole course in every student would repeat it thousands of times</td></tr>
<tr><td><code>INT AUTO_INCREMENT</code> id</td><td>Kept as <code>_id</code> (or a new ObjectId + <code>legacy_id</code>)</td><td>Keeping it makes re-runs idempotent and lets you trace each document back to its row</td></tr>
<tr><td><code>DECIMAL(10,2)</code> money</td><td><code>Decimal128</code></td><td>A JavaScript number (double) can't store 0.10 exactly</td></tr>
<tr><td><code>TINYINT(1)</code></td><td><code>true</code> / <code>false</code></td><td>MySQL has no real boolean type</td></tr>
<tr><td><code>DATE</code> / <code>DATETIME</code></td><td>BSON <code>Date</code> (UTC)</td><td>Allows date queries and sorting. Watch out for time zones</td></tr>
<tr><td><code>NULL</code></td><td>Field left out (or <code>null</code>)</td><td>Pick one rule and use it everywhere, so queries are predictable</td></tr>
<tr><td>For Cassandra: one normalized table</td><td>Several tables, one per query</td><td>Cassandra has no joins at all, so data is duplicated per access pattern</td></tr>
</tbody></table>

<h2>5. Performance Considerations</h2>
<h3>What to consider</h3>
<ul>
  <li><b>Network round trips</b>: sending rows one by one is slow, so batch them.</li>
  <li><b>How the source is read</b>: avoid <code>OFFSET</code> pagination and one query per row (the "N+1" problem), and make sure the source uses its indexes.</li>
  <li><b>Write cost on the target</b>: bulk writes, write concern, and indexes being updated during the load.</li>
  <li><b>Load on the production source</b>: a migration shouldn't slow down the live application, so throttle it or read from a replica.</li>
  <li><b>Document size</b>: embedding too much makes documents large (MongoDB's limit is 16 MB per document).</li>
  <li><b>Storage</b>: documents repeat field names and duplicated data (here, course titles inside every enrollment). In this run, the MySQL data took ${kb(R.sizes.mysql.data)}. The same data in MongoDB was ${kb(R.sizes.mongo.logical)} uncompressed, but only ${kb(R.sizes.mongo.data)} on disk, because MongoDB compresses its storage. So duplication costs space, but compression can more than make up for it.</li>
</ul>

<h3>How a DLoader-style pipeline optimizes it, measured</h3>
<p>The whole migration (${n(totalRows)} rows → ${n(totalDocs)} documents, plus indexes) took <b>${n(mig.totalMs)} ms</b> on my laptop. Here are the experiments behind that:</p>

<p><b>1. Batching.</b> I loaded the 20,000 students with different batch sizes (median of 3 runs each):</p>
${batchChart()}
<table>
<thead><tr><th class="num">Batch size</th>${R.batchSizes.map((b) => `<th class="num">${n(b.batchSize)}</th>`).join('')}</tr></thead>
<tbody><tr><td>Students per second</td>${R.batchSizes.map((b) => `<td class="num">${n(b.perSecond)}</td>`).join('')}</tr>
<tr><td>3 runs (ms)</td>${R.batchSizes.map((b) => `<td class="num">${b.runs.join(' / ')}</td>`).join('')}</tr></tbody></table>
<p>Going from 1 row per round trip to ${n(bestBatch.batchSize)} made it <b>about ${Math.round(bestBatch.perSecond / one.perSecond)}× faster</b>. Above about 1,000 it stops improving, because the
batches are then big enough that the round trips no longer matter. (The batch size 1 run was measured on 2,000 students, because it is so slow.)</p>

<p><b>2. The source database's statistics.</b> My first benchmark gave strange results. To find the cause, I timed each stage separately and found that the query reading
each batch's enrollments was slow. MySQL's statistics were out of date after the bulk insert, so it chose a bad plan: it scanned <i>every course</i> and its enrollments,
instead of jumping straight to the batch's students through the primary key. Running <code>ANALYZE TABLE</code> fixed it:</p>
<table>
<thead><tr><th>Query for 1,000 students</th><th class="num">Time</th><th>MySQL's plan</th></tr></thead>
<tbody>
<tr><td>Before <code>ANALYZE TABLE</code></td><td class="num">${statBefore.ms} ms</td><td>${esc(statBefore.plan.join(' → '))}</td></tr>
<tr><td>After <code>ANALYZE TABLE</code></td><td class="num">${statAfter.ms} ms</td><td>${esc(statAfter.plan.join(' → '))}</td></tr>
</tbody></table>
<p>That's ${(statBefore.ms / statAfter.ms).toFixed(1)}× faster for 1,000 ids (and ${stat100b.ms} → ${stat100a.ms} ms for 100 ids). My pipeline now refreshes the statistics before extracting.
The lesson: <b>a migration is only as fast as its slowest query, so check the source's query plans</b> with <code>EXPLAIN</code>.</p>

<p><b>3. Other techniques in the pipeline:</b></p>
<ul>
  <li><b>Keyset pagination</b> (<code>WHERE id &gt; last ORDER BY id LIMIT n</code>) instead of <code>OFFSET</code>, which gets slower and slower on big tables.</li>
  <li><b>One query per batch</b> for the enrollments (<code>WHERE student_id IN (…)</code>), not one per student: 20 queries instead of 20,000.</li>
  <li><b>Unordered bulk writes</b> (<code>bulkWrite</code>, <code>ordered: false</code>), so MongoDB can apply each batch efficiently.</li>
  <li><b>Indexes after the load.</b> The usual advice is to build indexes once at the end, not update them on every insert. At this size I measured
  ${R.indexTiming.afterMedian < R.indexTiming.beforeMedian ? 'a <b>small advantage</b> for creating them after the load' : '<b>no advantage</b>'} (median ${R.indexTiming.beforeMedian} ms with the indexes created first, ${R.indexTiming.afterMedian} ms after the load), and the
  difference changed from run to run. At 20,000 documents it hardly matters. The advice is for loads of millions of documents.</li>
</ul>

<h2>6. Consistency and Integrity</h2>
<h3>How the pipeline keeps the data consistent</h3>
<ul>
  <li><b>One consistent snapshot.</b> All reads happen inside <code>START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY</code>, so every batch sees the database
  as it was at the same moment, even if the application keeps writing. Without it, a student could be copied before a new enrollment and the enrollment missed.</li>
  <li><b>Idempotent loading.</b> Each document is <i>upserted</i> using its SQL primary key as <code>_id</code>. Running the migration twice gives the same result with
  no duplicates, so a failure halfway through is fixed by simply running it again.</li>
  <li><b>Integrity rules move into the code.</b> MongoDB has no foreign keys, so the pipeline checks references during validation instead.</li>
  <li>DLoader's <b>standardization</b> step <b>(paper)</b> also helps consistency: the same value is always written the same way (for example, lowercase emails).</li>
</ul>

<h3>Strategies to verify the migrated data, and my results</h3>
<table class="checks">
<colgroup><col style="width:34%"><col style="width:28%"><col style="width:28%"><col style="width:10%"></colgroup>
<thead><tr><th>Check</th><th class="num">MySQL</th><th class="num">MongoDB</th><th>Result</th></tr></thead>
<tbody>${R.validation.checks.map((c) => `<tr><td>${esc(c.name)}</td><td class="num">${esc(fmt(c.sql))}</td><td class="num">${esc(fmt(c.mongo))}</td><td>${ok(c.ok)}</td></tr>`).join('')}</tbody>
</table>
<p>The checks go from cheap to thorough:</p>
<ul>
  <li><b>Counts</b> catch lost or duplicated records.</li>
  <li><b>Checksums</b> (sums and group counts calculated independently on each side) catch wrong values.</li>
  <li>The <b>integrity</b> check catches broken references.</li>
  <li>The <b>record-by-record comparison</b> rebuilds random students from SQL and compares every field.</li>
</ul>

<p><b>Does the validation actually catch problems?</b> I broke the target on purpose in 3 ways: ${R.faultInjection.injected.map(esc).join('; ')}.
The validation <b>failed, as it should</b>, in ${failed.length} different checks:</p>
<ul>${failed.map((f) => `<li>${esc(f.name)}: MySQL ${esc(fmt(f.sql))}, MongoDB ${esc(fmt(f.mongo))}${f.detail ? ` (${esc(f.detail)})` : ''}</li>`).join('')}</ul>
<p>Then I simply <b>re-ran the migration</b>. Because it is idempotent, it repaired all three problems, and every check passed again with exactly ${n(R.rerun.studentCount)} students (no duplicates).</p>

<h2>7. Practical Application: A Migration Plan</h2>
<p><b>The scenario:</b> a university runs its student system on MySQL (the schema from my previous SQL checkpoint): departments, instructors, courses, students and enrollments.
The student portal is slow because every "my courses" page joins three tables, and the university wants to move the portal to MongoDB.</p>

<h3>The plan</h3>
<table>
<thead><tr><th>Phase</th><th>What happens</th><th>Done when</th></tr></thead>
<tbody>
<tr><td><b>1. Assess</b></td><td>Count rows, list keys and relationships, profile data quality (messy emails, NULL grades), list the portal's queries</td><td>We know what to move and how it's read</td></tr>
<tr><td><b>2. Design</b></td><td>Target model as in section 4: students embed their enrollments, courses embed their instructor's name, departments stay small</td><td>Every portal query can be answered by 1 document read</td></tr>
<tr><td><b>3. Configure DLoader</b></td><td>Column → field mapping, type conversions, cleaning rules, batch size 1,000, indexes to create</td><td>The mapping is written in code and reviewed</td></tr>
<tr><td><b>4. Rehearse</b></td><td>Run the full migration on a <b>copy</b> of production and run all the validation checks</td><td>All checks pass, the time is measured, and a re-run causes no duplicates</td></tr>
<tr><td><b>5. Migrate</b></td><td>Short write freeze (or snapshot + catch-up), run DLoader, validate</td><td>All checks pass on the real data</td></tr>
<tr><td><b>6. Cut over</b></td><td>Switch the portal to MongoDB; MySQL stays read-only as a fallback</td><td>The portal works, and errors and response times are normal</td></tr>
<tr><td><b>7. Monitor and clean up</b></td><td>Compare a sample of answers between old and new for a few weeks, then retire MySQL</td><td>No differences found</td></tr>
</tbody></table>
<p><b>Rollback plan:</b> until MySQL is retired, switching the portal back is just a configuration change, because MySQL was never modified.</p>

<h3>How I implemented it</h3>
<p>I implemented phases 2 to 5 and ran them on a temporary copy filled with ${n(src.students)} generated students:</p>
<pre>npm run migrate</pre>
<ol>
  <li><code>run.js</code> creates the MySQL schema and the test data (${n(totalRows)} rows, including a few messy emails on purpose).</li>
  <li><code>pipeline.js</code> refreshes the statistics, opens a consistent snapshot, then for each table: <b>extracts</b> 1,000 rows at a time,
  <b>transforms</b> them (clean, convert, embed) and <b>loads</b> them with bulk upserts. Then it creates the indexes.</li>
  <li><code>validate.js</code> runs the ${R.validation.checks.length} checks above. All of them passed.</li>
  <li>The rehearsal tests are included too: breaking data on purpose, re-running to repair it, and measuring performance.</li>
</ol>
<p>The same question, <i>"show student 50 with their courses"</i>, needs a 3-table <code>JOIN</code> returning ${R.queryExample.sqlRows} rows in MySQL, but <b>a single
<code>findOne</code></b> returning 1 document in MongoDB. That's exactly the access pattern the new model was designed for.</p>

<h2>8. Case Studies</h2>
<h3>Netflix: Oracle → SimpleDB → Cassandra</h3>
<p>When Netflix moved to the cloud around 2010–2011, it moved its data out of its own Oracle databases, first to Amazon SimpleDB and S3, and later to Cassandra.
Talks from the time describe the method: <b>dual writes</b> to both systems, a bulk <b>"forklift"</b> of the existing data, and a <b>consistency checker</b> to compare the two.
Its billing data, spread over many Oracle tables, was transformed into a much simpler Cassandra structure. The main motivations were availability and scale:
the central Oracle database was a single point of failure.</p>

<h3>Craigslist: MySQL archive → MongoDB</h3>
<p>Craigslist kept its live postings in MySQL but moved its <b>archive</b> of old postings to MongoDB (2011, over two billion documents according to MongoDB's case study).
Every schema change on the huge archive took a very long time, and archive data piled up in the production database. Each expired posting became one
JSON-like document. MySQL stayed for the live site, so this was a <b>partial</b> migration of the data that suited documents best.</p>

<h3>Diaspora: MongoDB → MySQL (the other direction)</h3>
<p>The Diaspora social network started on MongoDB and, after months in production, <b>moved to MySQL</b>. Sarah Mei, one of its developers, explained that social data
(users, friends, posts, comments) is deeply <b>relational</b>. In documents it had to be duplicated and kept in sync by hand, which caused inconsistencies.</p>

<h3>Lessons learned</h3>
<ul>
  <li><b>Choose by access pattern, not fashion.</b> Craigslist's archive (write once, read as a whole) fitted documents perfectly. Diaspora's interconnected social data did not.</li>
  <li><b>You don't have to migrate everything.</b> Craigslist kept MySQL for the live site, and a hybrid is often the best answer.</li>
  <li><b>Plan for running both systems in parallel</b>, with dual writes and a consistency checker (Netflix), the same idea as my validation step.</li>
  <li><b>The data model must be redesigned</b>, not copied table by table.</li>
</ul>

<h2>9. Conclusion</h2>
<div class="two">
<table><caption>Advantages of moving to NoSQL</caption><tbody>
<tr><td>Horizontal scaling across many servers</td></tr>
<tr><td>Flexible schema: new fields without a migration</td></tr>
<tr><td>Fast reads when a document holds everything a page needs (1 read instead of a 3-table join)</td></tr>
<tr><td>Natural fit for JSON APIs and semi-structured data</td></tr>
<tr><td>High availability through replication (Netflix's main reason)</td></tr>
</tbody></table>
<table><caption>Disadvantages and risks</caption><tbody>
<tr><td>Joins and ad-hoc queries become harder</td></tr>
<tr><td>Duplicated data has to be kept in sync by the application</td></tr>
<tr><td>Weaker built-in integrity (no foreign keys), and transactions are more limited or costly</td></tr>
<tr><td>Every query in the application has to be rewritten</td></tr>
<tr><td>Often more storage, and the migration itself is a risky project</td></tr>
</tbody></table>
</div>

<div class="answer"><b>When I would recommend DLoader.</b> I'd use the DLoader approach (extract → preprocess/standardize → map → load, plus validation) for a <b>planned, batch migration
of MySQL data into MongoDB or Cassandra</b>, when:
<ul>
  <li>the data is mostly <b>read as a whole</b> (like a student with their courses, or an archived posting);</li>
  <li>the access patterns are known, so the target model can be designed well;</li>
  <li>a short write freeze or a catch-up step is acceptable.</li>
</ul>
I would <b>not</b> use it when:
<ul>
  <li>the data is highly relational and transactional (bank transfers, social graphs, like Diaspora);</li>
  <li>both databases must stay in sync continuously for a long time. That calls for change-data-capture or replication tools.</li>
</ul>
Also, because DLoader is a research prototype with no public release that I could find, a real company would probably rely on a maintained tool
built on the same ideas. Its value for me was showing clearly <b>what every migration needs</b>: careful mapping, cleaning, batching and validation.</div>

<h3>Sources</h3>
<ul class="src">
  <li>K. Rajaram, P. Sharma, S. Selvakumar, "DLoader: Migration of Data from SQL to NoSQL Databases", <i>Proc. Int. Conf. on Cognitive and Intelligent Computing</i>,
    Springer (Cognitive Science and Technology), 2023, pp. 193–204. https://link.springer.com/chapter/10.1007/978-981-19-2358-6_19 (metadata confirmed via Crossref)</li>
  <li>Netflix: S. Anand, "NoSQL @ Netflix", QCon London 2011, https://www.infoq.com/presentations/NoSQL-Netflix · A. Cockcroft, "Migrating Netflix from Oracle to Global Cassandra" (2011),
    https://www.slideshare.net/slideshow/migrating-netflix-from-oracle-to-global-cassandra/8600029</li>
  <li>Craigslist: MongoDB case study, https://www.mongodb.com/resources/solutions/use-cases/mongodb-case-study-craigslist ·
    TheServerSide, https://www.theserverside.com/feature/How-NoSQL-MySQL-and-MogoDB-worked-together-to-solve-a-big-data-problem</li>
  <li>Diaspora: S. Mei, "Why You Should Never Use MongoDB" (2013), http://www.sarahmei.com/blog/2013/11/11/why-you-should-never-use-mongodb/ ·
    "MongoDB to MySQL: The How and the Why", RubyConf 2011, https://www.rubyevents.org/talks/mongodb-to-mysql-the-how-and-the-why</li>
</ul>

<footer>Measured on MySQL ${esc(R.versions.mysql)} and MongoDB ${esc(R.versions.mongodb)} (Node ${esc(R.versions.node)}), temporary local servers, one laptop.
Timings vary between machines; the comparisons between them are what matter. Reproduce with <code>npm run migrate &amp;&amp; npm run report</code>.</footer>
</body></html>`;

fs.writeFileSync(path.join(__dirname, 'report.html'), html);
console.log('Wrote report/report.html');
