// Runs the whole demo on real (temporary) MySQL and MongoDB servers:
//   1. create the university schema in MySQL and fill it with generated data
//   2. migrate it to MongoDB with the DLoader-style pipeline
//   3. validate the result
//   4. break the target on purpose -> validation must catch it -> re-run repairs it
//   5. performance experiments (batch size, indexes before vs after)
// Results are saved to dloader/results.json (used by the report).
//
// Run with: npm run migrate   (the first run downloads MySQL)

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');
const { createDB } = require('mysql-memory-server');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { migrate, prepareSource, transform, extractBatches, load, SOURCES, enrollmentsFor } = require('./pipeline');

// Times the "enrollments for a batch of students" query and shows MySQL's plan
async function timeEnrollmentQuery(conn, n) {
  const ids = Array.from({ length: n }, (_, i) => i + 1);
  const sql = `SELECT e.student_id, e.course_id, c.title AS course_title, e.grade, e.enrolled_on
     FROM enrollments e JOIN courses c ON c.course_id = e.course_id
     WHERE e.student_id IN (?) ORDER BY e.student_id, e.course_id`;
  const [plan] = await conn.query(`EXPLAIN FORMAT=TREE ${sql}`, [ids]);
  const t = process.hrtime.bigint();
  for (let k = 0; k < 20; k++) await conn.query(sql, [ids]);
  const ms = Number(process.hrtime.bigint() - t) / 1e6 / 20;
  const steps = Object.values(plan[0])[0]
    .split('\n')
    .filter((l) => /scan|lookup/i.test(l))
    .map((l) => l.trim().replace(/^-> /, '').replace(/,? with index condition.*$/, '').replace(/\s+\(cost.*$/, '').replace(/over \(student_id = 1\).*$/, 'over student_id IN (…)'));
  return { ids: n, ms: Math.round(ms * 10) / 10, plan: steps };
}
const { validate } = require('./validate');

const SIZE = { departments: 8, instructors: 60, courses: 300, students: 20000, maxCoursesPerStudent: 9 };

// Deterministic random numbers, so every run produces the same data
function rng(seed) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

async function seed(conn) {
  const rand = rng(7);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const first = ['Amina', 'Chinedu', 'Fatima', 'David', 'Grace', 'Ibrahim', 'Ngozi', 'Tunde', 'Zainab', 'Emeka', 'Kemi', 'Musa', 'Ada', 'Bola', 'Yusuf', 'Ifeoma'];
  const last = ['Yusuf', 'Okafor', 'Bello', 'Mensah', 'Adeyemi', 'Eze', 'Bakare', 'Lawal', 'Obi', 'Danjuma', 'Okonkwo', 'Balogun', 'Nwosu', 'Abubakar'];
  const depts = ['Computer Science', 'Information Systems', 'Mathematics', 'Physics', 'Economics', 'Statistics', 'Electrical Engineering', 'Linguistics'];
  const subjects = ['Database Systems', 'Web Development', 'Algorithms', 'Linear Algebra', 'Networks', 'Operating Systems', 'Statistics', 'Microeconomics', 'Machine Learning', 'Compilers'];

  await conn.query('INSERT INTO departments (department_id, name) VALUES ?', [depts.slice(0, SIZE.departments).map((d, i) => [i + 1, d])]);
  await conn.query('INSERT INTO instructors (instructor_id, full_name, email, department_id) VALUES ?', [
    Array.from({ length: SIZE.instructors }, (_, i) => [i + 1, `Dr. ${pick(first)} ${pick(last)}`, `instructor${i + 1}@uni.edu`, 1 + (i % SIZE.departments)]),
  ]);
  await conn.query('INSERT INTO courses (course_id, title, credits, instructor_id) VALUES ?', [
    Array.from({ length: SIZE.courses }, (_, i) => [
      i + 1,
      `${subjects[i % subjects.length]} ${100 + Math.floor(i / subjects.length)}`,
      1 + Math.floor(rand() * 6),
      rand() < 0.05 ? null : 1 + Math.floor(rand() * SIZE.instructors), // ~5% without an instructor
    ]),
  ]);

  const students = [];
  const enrollments = [];
  for (let id = 1; id <= SIZE.students; id++) {
    // some messy source data on purpose: spaces and capitals in emails
    const email = id % 50 === 0 ? `  Student${id}@Student.UNI.edu ` : `student${id}@student.uni.edu`;
    students.push([id, `${pick(first)} ${pick(last)}`, email, 18 + Math.floor(rand() * 20)]);
    const n = Math.floor(rand() * (SIZE.maxCoursesPerStudent + 1)); // 0..9 courses
    const taken = new Set();
    while (taken.size < n) taken.add(1 + Math.floor(rand() * SIZE.courses));
    for (const c of taken) {
      const grade = rand() < 0.15 ? null : pick(['A', 'B', 'C', 'D', 'E', 'F']);
      const day = 1 + Math.floor(rand() * 28);
      enrollments.push([id, c, grade, `2026-09-${String(day).padStart(2, '0')}`]);
    }
  }
  for (let i = 0; i < students.length; i += 5000) {
    await conn.query('INSERT INTO students (student_id, full_name, email, age) VALUES ?', [students.slice(i, i + 5000)]);
  }
  for (let i = 0; i < enrollments.length; i += 10000) {
    await conn.query('INSERT INTO enrollments (student_id, course_id, grade, enrolled_on) VALUES ?', [enrollments.slice(i, i + 10000)]);
  }
}

async function sizes(mysqlConn, mongo) {
  const [rows] = await mysqlConn.query(
    `SELECT SUM(DATA_LENGTH) AS data, SUM(INDEX_LENGTH) AS idx FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()`,
  );
  // Force MongoDB to write everything to its data files first. Otherwise
  // fresh data is still only in memory/journal and storageSize looks ~0.
  await mongo.admin().command({ fsync: 1 });
  let mongoData = 0;
  let mongoLogical = 0;
  let mongoIdx = 0;
  for (const c of ['departments', 'instructors', 'courses', 'students']) {
    const [s] = await mongo.collection(c).aggregate([{ $collStats: { storageStats: {} } }]).toArray();
    mongoData += s.storageStats.storageSize; // on disk, compressed (snappy)
    mongoLogical += s.storageStats.size; // uncompressed BSON size
    mongoIdx += s.storageStats.totalIndexSize;
  }
  return {
    mysql: { data: Number(rows[0].data), indexes: Number(rows[0].idx) },
    mongo: { data: mongoData, logical: mongoLogical, indexes: mongoIdx },
  };
}

async function main() {
  const log = (...a) => console.log(...a);
  log('Starting temporary MySQL and MongoDB servers...');
  const [mysqlServer, mongoServer] = await Promise.all([
    createDB({ dbName: 'university', logLevel: 'ERROR' }),
    // By default MongoDB refuses to build indexes with less than 500 MB of free
    // disk. This is a throwaway demo database, so 100 MB is enough.
    MongoMemoryServer.create({ instance: { args: ['--setParameter', 'indexBuildMinAvailableDiskSpaceMB=100'] } }),
  ]);
  const mysqlConn = await mysql.createConnection({
    host: '127.0.0.1', port: mysqlServer.port, user: mysqlServer.username, database: mysqlServer.dbName, dateStrings: true, multipleStatements: true,
  });
  const client = await MongoClient.connect(mongoServer.getUri());
  const mongo = client.db('university');
  const out = { generatedAt: new Date().toISOString() };

  try {
    const [[{ v }]] = await mysqlConn.query('SELECT VERSION() AS v');
    const { version: mv } = await mongo.admin().serverInfo();
    out.versions = { mysql: v, mongodb: mv, node: process.version };

    // ---- 1. Source database
    await mysqlConn.query(fs.readFileSync(path.join(__dirname, 'source-schema.sql'), 'utf8'));
    const t0 = Date.now();
    await seed(mysqlConn);
    const [[counts]] = await mysqlConn.query(
      `SELECT (SELECT COUNT(*) FROM departments) d, (SELECT COUNT(*) FROM instructors) i, (SELECT COUNT(*) FROM courses) c,
              (SELECT COUNT(*) FROM students) s, (SELECT COUNT(*) FROM enrollments) e`,
    );
    out.source = { departments: counts.d, instructors: counts.i, courses: counts.c, students: counts.s, enrollments: counts.e, seedMs: Date.now() - t0 };
    log(`\nSource (MySQL ${v}): ${JSON.stringify(out.source)}`);

    // Example: one student before/after, for the report
    const [[exampleRow]] = await mysqlConn.query('SELECT * FROM students WHERE student_id = 50');
    const [exampleEnrollments] = await mysqlConn.query('SELECT * FROM enrollments WHERE student_id = 50 ORDER BY course_id');
    out.example = { sqlStudent: exampleRow, sqlEnrollments: exampleEnrollments };

    // Stale statistics experiment: the extraction query before/after ANALYZE TABLE
    out.statistics = { before: [], after: [] };
    for (const n of [50, 100, 1000]) out.statistics.before.push(await timeEnrollmentQuery(mysqlConn, n));
    await prepareSource(mysqlConn);
    for (const n of [50, 100, 1000]) out.statistics.after.push(await timeEnrollmentQuery(mysqlConn, n));
    log('\nExtraction query (enrollments for a batch of students):');
    for (const k of ['before', 'after']) {
      for (const r of out.statistics[k]) log(`  ${k.padEnd(6)} ANALYZE, ${String(r.ids).padStart(4)} ids: ${r.ms} ms  [${r.plan.join(' → ')}]`);
    }

    // ---- 2. Migrate
    log(`\nMigrating to MongoDB ${mv} (batch size 1000)...`);
    out.migration = await migrate({ mysqlConn, mongo, batchSize: 1000, log });
    out.migration.docsPerSecond = Math.round(
      (out.source.departments + out.source.instructors + out.source.courses + out.source.students) / (out.migration.totalMs / 1000),
    );
    log(`  done in ${out.migration.totalMs} ms (indexes: ${out.migration.indexMs} ms)`);
    out.example.mongoStudent = await mongo.collection('students').findOne({ _id: 50 });
    out.example.mongoCourse = await mongo.collection('courses').findOne({ _id: out.example.mongoStudent.enrollments[0]?.course_id ?? 1 });

    // ---- 3. Validate
    out.validation = await validate({ mysqlConn, mongo });
    log(`\nValidation: ${out.validation.ok ? 'ALL CHECKS PASSED' : 'FAILED'}`);
    for (const c of out.validation.checks) log(`  ${c.ok ? '✔' : '✘'} ${c.name}: SQL=${JSON.stringify(c.sql)} Mongo=${JSON.stringify(c.mongo)}`);

    // ---- 4. Fault injection: does validation notice problems?
    const students = mongo.collection('students');
    await students.updateOne({ _id: 123 }, { $pop: { enrollments: 1 } }); // lose an enrollment
    await students.updateOne({ _id: 456 }, { $set: { email: 'wrong@example.com' } }); // corrupt a value
    await students.deleteOne({ _id: 789 }); // lose a whole student
    const broken = await validate({ mysqlConn, mongo, sampleSize: 20000 });
    out.faultInjection = {
      injected: ['student 123: last enrollment removed', 'student 456: email changed', 'student 789: document deleted'],
      ok: broken.ok,
      failedChecks: broken.checks.filter((c) => !c.ok).map((c) => ({ name: c.name, sql: c.sql, mongo: c.mongo, detail: c.detail })),
    };
    log(`\nAfter breaking 3 students on purpose: ${broken.ok ? 'NOT detected!' : `detected by ${out.faultInjection.failedChecks.length} checks`}`);

    // Re-running the migration repairs it (upserts are idempotent: no duplicates)
    const rerun = await migrate({ mysqlConn, mongo, batchSize: 1000 });
    const fixed = await validate({ mysqlConn, mongo });
    out.rerun = { ok: fixed.ok, ms: rerun.totalMs, studentCount: await students.countDocuments() };
    log(`Re-run of the migration: ${fixed.ok ? 'repaired, all checks pass again' : 'still broken'}, ${out.rerun.studentCount} students (no duplicates)`);

    out.sizes = await sizes(mysqlConn, mongo);

    // ---- 5a. Performance: batch size (each measured 3 times, median kept,
    //      because a single timing on a laptop is noisy)
    const REPS = 3;
    const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
    log(`\nBatch size experiment (students + enrollments → a scratch collection, median of ${REPS} runs):`);
    out.batchSizes = [];
    for (const batchSize of [1, 10, 100, 1000, 5000]) {
      const limit = batchSize === 1 ? 2000 : SIZE.students; // batch size 1 is very slow: measure on 2,000 students
      const times = [];
      let done = 0;
      for (let rep = 0; rep < REPS; rep++) {
        const target = mongo.collection(`bench_${batchSize}_${rep}`);
        const t = Date.now();
        done = 0;
        await mysqlConn.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');
        for await (const rows of extractBatches(mysqlConn, SOURCES.students.sql, SOURCES.students.id, batchSize)) {
          const part = rows.slice(0, limit - done);
          const byStudent = await enrollmentsFor(mysqlConn, part.map((r) => r.student_id));
          await load(target, part.map((r) => transform.student(r, byStudent.get(r.student_id))));
          done += part.length;
          if (done >= limit) break;
        }
        await mysqlConn.query('COMMIT');
        times.push(Date.now() - t);
        await target.drop();
      }
      const ms = median(times);
      out.batchSizes.push({ batchSize, students: done, ms, runs: times, perSecond: Math.round(done / (ms / 1000)) });
      log(`  batch ${String(batchSize).padStart(4)}: ${done} students, median ${ms} ms (runs: ${times.join(', ')}) → ${Math.round(done / (ms / 1000))} students/s`);
    }

    // ---- 5b. Performance: create indexes before vs after the bulk load (median of 3)
    out.indexTiming = { before: [], after: [] };
    for (let rep = 0; rep < REPS; rep++) {
      for (const when of ['before', 'after']) {
        const target = mongo.collection(`idx_${when}_${rep}`);
        const t = Date.now();
        const mk = () => Promise.all([target.createIndex({ email: 1 }, { unique: true }), target.createIndex({ 'enrollments.course_id': 1 }), target.createIndex({ full_name: 1 })]);
        if (when === 'before') await mk();
        for await (const rows of extractBatches(mysqlConn, SOURCES.students.sql, SOURCES.students.id, 1000)) {
          const byStudent = await enrollmentsFor(mysqlConn, rows.map((r) => r.student_id));
          await load(target, rows.map((r) => transform.student(r, byStudent.get(r.student_id))));
        }
        if (when === 'after') await mk();
        out.indexTiming[when].push(Date.now() - t);
        await target.drop();
      }
    }
    out.indexTiming.beforeMedian = median(out.indexTiming.before);
    out.indexTiming.afterMedian = median(out.indexTiming.after);
    log(`Indexes before load: median ${out.indexTiming.beforeMedian} ms (${out.indexTiming.before.join(', ')}) · after load: median ${out.indexTiming.afterMedian} ms (${out.indexTiming.after.join(', ')})`);

    // ---- Query example: the same question in both databases
    const tq1 = Date.now();
    const [sqlAnswer] = await mysqlConn.query(
      `SELECT s.full_name, c.title, e.grade FROM students s JOIN enrollments e ON e.student_id = s.student_id
       JOIN courses c ON c.course_id = e.course_id WHERE s.student_id = 50 ORDER BY c.course_id`,
    );
    const sqlMs = Date.now() - tq1;
    const tq2 = Date.now();
    const mongoAnswer = await students.findOne({ _id: 50 }, { projection: { full_name: 1, enrollments: 1 } });
    const mongoMs = Date.now() - tq2;
    out.queryExample = { sqlRows: sqlAnswer.length, mongoDocs: 1, mongoEnrollments: mongoAnswer.enrollments.length, sqlMs, mongoMs };

    fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(out, null, 2));
    log('\nSaved dloader/results.json');
  } finally {
    await client.close();
    await mysqlConn.end();
    await Promise.allSettled([mysqlServer.stop(), mongoServer.stop()]);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
