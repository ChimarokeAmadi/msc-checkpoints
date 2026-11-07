// A small DLoader-style migration pipeline: MySQL -> MongoDB.
//
// It follows the three stages described in the DLoader paper:
//   1. EXTRACT    read the rows from MySQL (in batches, from one consistent snapshot)
//   2. TRANSFORM  clean/standardize values and reshape rows into documents
//   3. MAP + LOAD map the SQL columns to document fields and write them to MongoDB
// plus a 4th stage the paper's approach needs in practice:
//   4. VALIDATE   prove the target matches the source (validate.js)

// ---------------------------------------------------------------------------
// The mapping: which SQL table becomes which MongoDB collection, and how
// ---------------------------------------------------------------------------
//   departments              -> departments   (1 row = 1 document)
//   instructors + department -> instructors   (department name EMBEDDED: read together)
//   courses + instructor     -> courses       (instructor id + name EMBEDDED: "extended reference")
//   students + enrollments   -> students      (enrollments EMBEDDED as an array: a student
//                                             has a small, bounded number of them, and we
//                                             always show a student with their courses)
// SQL ids are kept as _id, so loading twice updates instead of duplicating (idempotent).

// ---------------------------------------------------------------------------
// TRANSFORM helpers (standardization)
// ---------------------------------------------------------------------------

// MySQL DATE comes back as 'YYYY-MM-DD' (dateStrings) -> a real BSON Date at UTC midnight
const toDate = (value) => (value == null ? undefined : new Date(`${value}T00:00:00Z`));

// Trim text and lowercase emails, so "  Amina@Uni.EDU " and "amina@uni.edu" are the same
const cleanText = (value) => (value == null ? value : String(value).trim());
const cleanEmail = (value) => cleanText(value)?.toLowerCase();

// SQL NULL -> leave the field out of the document (the "missing field" style).
// Dropping undefined keys keeps documents small and lets queries use { $exists }.
function compact(obj) {
  for (const key of Object.keys(obj)) {
    if (obj[key] === undefined || obj[key] === null) delete obj[key];
  }
  return obj;
}

const transform = {
  department: (row) => ({ _id: row.department_id, name: cleanText(row.name) }),

  instructor: (row) => ({
    _id: row.instructor_id,
    full_name: cleanText(row.full_name),
    email: cleanEmail(row.email),
    department: { id: row.department_id, name: cleanText(row.department_name) },
  }),

  course: (row) =>
    compact({
      _id: row.course_id,
      title: cleanText(row.title),
      credits: Number(row.credits), // TINYINT UNSIGNED -> number
      instructor: row.instructor_id == null ? null : { id: row.instructor_id, full_name: cleanText(row.instructor_name) },
    }),

  // One student row + their enrollment rows (from the join table) -> ONE document
  student: (row, enrollmentRows) =>
    compact({
      _id: row.student_id,
      full_name: cleanText(row.full_name),
      email: cleanEmail(row.email),
      age: Number(row.age),
      enrollments: enrollmentRows.map((e) =>
        compact({
          course_id: e.course_id,
          course_title: cleanText(e.course_title), // copied so we don't need a join to display it
          grade: e.grade ?? undefined, // NULL grade (in progress) -> field omitted
          enrolled_on: toDate(e.enrolled_on),
        }),
      ),
      enrollment_count: enrollmentRows.length,
    }),
};

// ---------------------------------------------------------------------------
// EXTRACT: keyset pagination ("WHERE id > last ORDER BY id LIMIT n")
// Unlike OFFSET, it stays fast on big tables: MySQL jumps straight to the
// next id through the primary key index instead of skipping rows.
// ---------------------------------------------------------------------------
async function* extractBatches(conn, sql, idColumn, batchSize) {
  let lastId = 0;
  for (;;) {
    const [rows] = await conn.query(`${sql} WHERE ${idColumn} > ? ORDER BY ${idColumn} LIMIT ?`, [lastId, batchSize]);
    if (rows.length === 0) return;
    yield rows;
    lastId = rows[rows.length - 1][idColumn.split('.').pop()];
  }
}

const SOURCES = {
  departments: { sql: 'SELECT department_id, name FROM departments', id: 'department_id' },
  instructors: {
    sql: `SELECT * FROM (SELECT i.instructor_id, i.full_name, i.email, i.department_id, d.name AS department_name
          FROM instructors i JOIN departments d ON d.department_id = i.department_id) x`,
    id: 'instructor_id',
  },
  courses: {
    sql: `SELECT * FROM (SELECT c.course_id, c.title, c.credits, c.instructor_id, i.full_name AS instructor_name
          FROM courses c LEFT JOIN instructors i ON i.instructor_id = c.instructor_id) x`,
    id: 'course_id',
  },
  students: { sql: 'SELECT student_id, full_name, email, age FROM students', id: 'student_id' },
};

// For a batch of students, fetch ALL their enrollments in ONE query
// (instead of one query per student: the "N+1 queries" problem)
async function enrollmentsFor(conn, studentIds) {
  const [rows] = await conn.query(
    `SELECT e.student_id, e.course_id, c.title AS course_title, e.grade, e.enrolled_on
     FROM enrollments e JOIN courses c ON c.course_id = e.course_id
     WHERE e.student_id IN (?) ORDER BY e.student_id, e.course_id`,
    [studentIds],
  );
  const byStudent = new Map(studentIds.map((id) => [id, []]));
  for (const r of rows) byStudent.get(r.student_id).push(r);
  return byStudent;
}

// ---------------------------------------------------------------------------
// LOAD: bulkWrite of upserts, unordered (MongoDB can apply them in parallel,
// and one bad document doesn't stop the rest of the batch)
// ---------------------------------------------------------------------------
async function load(collection, docs) {
  if (docs.length === 0) return { upserted: 0, modified: 0, matched: 0 };
  const ops = docs.map((doc) => ({ replaceOne: { filter: { _id: doc._id }, replacement: doc, upsert: true } }));
  const r = await collection.bulkWrite(ops, { ordered: false });
  return { upserted: r.upsertedCount, modified: r.modifiedCount, matched: r.matchedCount };
}

// The indexes the application needs, created AFTER the bulk load (faster:
// MongoDB builds each index once, instead of updating it on every insert)
async function createIndexes(mongo) {
  await mongo.collection('students').createIndex({ email: 1 }, { unique: true });
  await mongo.collection('students').createIndex({ 'enrollments.course_id': 1 });
  await mongo.collection('instructors').createIndex({ email: 1 }, { unique: true });
  await mongo.collection('courses').createIndex({ title: 1 }, { unique: true });
}

// ---------------------------------------------------------------------------
// The whole migration
// ---------------------------------------------------------------------------
// Refresh MySQL's table statistics before extracting. After big bulk loads they
// can be stale, and MySQL then picks a bad plan for the enrollments query
// (scanning every course instead of jumping to the students' rows by primary key).
async function prepareSource(mysqlConn) {
  await mysqlConn.query('ANALYZE TABLE departments, instructors, courses, students, enrollments');
}

async function migrate({ mysqlConn, mongo, batchSize = 1000, log = () => {} }) {
  const stats = { batchSize, collections: {}, startedAt: Date.now() };
  await prepareSource(mysqlConn);

  // One consistent snapshot of the source: every SELECT below sees the
  // database exactly as it was at this moment, even if the app keeps writing.
  await mysqlConn.query('SET SESSION TRANSACTION ISOLATION LEVEL REPEATABLE READ');
  await mysqlConn.query('START TRANSACTION WITH CONSISTENT SNAPSHOT, READ ONLY');

  try {
    for (const [name, fn] of [['departments', transform.department], ['instructors', transform.instructor], ['courses', transform.course]]) {
      const t0 = Date.now();
      let n = 0;
      for await (const rows of extractBatches(mysqlConn, SOURCES[name].sql, SOURCES[name].id, batchSize)) {
        await load(mongo.collection(name), rows.map(fn));
        n += rows.length;
      }
      stats.collections[name] = { rows: n, documents: n, ms: Date.now() - t0 };
      log(`  ${name}: ${n} rows → ${n} documents`);
    }

    const t0 = Date.now();
    let students = 0;
    let enrollments = 0;
    for await (const rows of extractBatches(mysqlConn, SOURCES.students.sql, SOURCES.students.id, batchSize)) {
      const byStudent = await enrollmentsFor(mysqlConn, rows.map((r) => r.student_id));
      const docs = rows.map((r) => transform.student(r, byStudent.get(r.student_id)));
      await load(mongo.collection('students'), docs);
      students += rows.length;
      enrollments += docs.reduce((s, d) => s + d.enrollment_count, 0);
    }
    stats.collections.students = { rows: students, documents: students, embeddedEnrollments: enrollments, ms: Date.now() - t0 };
    log(`  students + enrollments: ${students} + ${enrollments} rows → ${students} documents`);
  } finally {
    await mysqlConn.query('COMMIT');
  }

  const t1 = Date.now();
  await createIndexes(mongo);
  stats.indexMs = Date.now() - t1;
  stats.totalMs = Date.now() - stats.startedAt;
  return stats;
}

module.exports = { migrate, prepareSource, transform, extractBatches, enrollmentsFor, load, createIndexes, SOURCES, toDate, cleanEmail };
