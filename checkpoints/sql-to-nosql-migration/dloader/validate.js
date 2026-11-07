// VALIDATE: prove that MongoDB now holds exactly what MySQL had.
// Four independent checks, from cheap to thorough.

const assert = require('assert');
const { transform, enrollmentsFor } = require('./pipeline');

async function validate({ mysqlConn, mongo, sampleSize = 200 }) {
  const checks = [];
  const add = (name, sqlValue, mongoValue, detail = '') => {
    let ok;
    try {
      assert.deepStrictEqual(mongoValue, sqlValue);
      ok = true;
    } catch {
      ok = false;
    }
    checks.push({ name, sql: sqlValue, mongo: mongoValue, ok, detail });
  };
  const one = async (sql) => (await mysqlConn.query(sql))[0][0];
  const col = (name) => mongo.collection(name);

  // 1. COUNTS: every row arrived, nothing was duplicated
  for (const t of ['departments', 'instructors', 'courses', 'students']) {
    add(`count: ${t}`, (await one(`SELECT COUNT(*) AS n FROM ${t}`)).n, await col(t).countDocuments());
  }
  const [emb] = await col('students').aggregate([{ $group: { _id: null, n: { $sum: { $size: '$enrollments' } } } }]).toArray();
  add('count: enrollments (rows vs embedded array items)', (await one('SELECT COUNT(*) AS n FROM enrollments')).n, emb?.n ?? 0);

  // 2. AGGREGATE CHECKSUMS: the values are right, not just the number of rows
  const [ages] = await col('students').aggregate([{ $group: { _id: null, s: { $sum: '$age' } } }]).toArray();
  add('checksum: sum of all ages', Number((await one('SELECT SUM(age) AS s FROM students')).s), ages?.s ?? 0);

  const [sqlGrades] = await mysqlConn.query("SELECT COALESCE(grade, 'none') AS g, COUNT(*) AS n FROM enrollments GROUP BY g ORDER BY g");
  const mongoGrades = await col('students')
    .aggregate([{ $unwind: '$enrollments' }, { $group: { _id: { $ifNull: ['$enrollments.grade', 'none'] }, n: { $sum: 1 } } }, { $sort: { _id: 1 } }])
    .toArray();
  add(
    'checksum: number of each grade (A–F, none)',
    Object.fromEntries(sqlGrades.map((r) => [r.g, r.n])),
    Object.fromEntries(mongoGrades.map((r) => [r._id, r.n])),
  );

  const [credits] = await col('courses').aggregate([{ $group: { _id: null, s: { $sum: '$credits' } } }]).toArray();
  add('checksum: total credits', Number((await one('SELECT SUM(credits) AS s FROM courses')).s), credits?.s ?? 0);

  // 3. REFERENTIAL INTEGRITY: no embedded enrollment points to a missing course
  const [orphans] = await col('students')
    .aggregate([
      { $unwind: '$enrollments' },
      { $lookup: { from: 'courses', localField: 'enrollments.course_id', foreignField: '_id', as: 'c' } },
      { $match: { c: { $size: 0 } } },
      { $count: 'n' },
    ])
    .toArray();
  add('integrity: enrollments pointing to a missing course', 0, orphans?.n ?? 0);

  // 4. RECORD-BY-RECORD: rebuild random students from SQL and compare the
  //    whole document field by field
  const [sample] = await mysqlConn.query('SELECT student_id, full_name, email, age FROM students ORDER BY RAND() LIMIT ?', [sampleSize]);
  const byStudent = await enrollmentsFor(mysqlConn, sample.map((s) => s.student_id));
  const differences = [];
  for (const row of sample) {
    const expected = transform.student(row, byStudent.get(row.student_id));
    const actual = await col('students').findOne({ _id: row.student_id });
    try {
      assert.deepStrictEqual(actual, expected);
    } catch {
      differences.push(row.student_id);
    }
  }
  add(`sample: ${sample.length.toLocaleString('en-US')} random students compared field by field`, 0, differences.length, differences.length ? `different: ${differences.slice(0, 5).join(', ')}` : '');

  return { ok: checks.every((c) => c.ok), checks };
}

module.exports = { validate };
