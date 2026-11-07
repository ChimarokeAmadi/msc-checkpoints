// Part 1 demo: two transfers that touch the SAME account, run as real
// concurrent transactions on a real MySQL (InnoDB) server.
//
//   T1: transfer 200 from Amira (account 1) to Bilel  (account 2)
//   T2: transfer 300 from Amira (account 1) to Cyrine (account 3)
//
// Amira starts with 1000, so after both transfers she must have 500.
// We force the dangerous interleaving step by step with two connections and
// try four strategies. Results are saved to demo/results-concurrency.json
// (used by the report).
//
// Run with: npm run concurrency   (the first run downloads MySQL)

const fs = require('fs');
const path = require('path');
const { startMySQL } = require('./db');

const START = { 1: 1000, 2: 500, 3: 300 };
const TOTAL = Object.values(START).reduce((a, b) => a + b, 0);
const EXPECTED = { 1: 500, 2: 700, 3: 600 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function resetAccounts(admin) {
  await admin.query('DROP TABLE IF EXISTS accounts');
  await admin.query(`
    CREATE TABLE accounts (
      id      INT PRIMARY KEY,
      owner   VARCHAR(50) NOT NULL,
      balance DECIMAL(12,2) NOT NULL CHECK (balance >= 0),
      version INT NOT NULL DEFAULT 0
    ) ENGINE=InnoDB`);
  await admin.query(
    'INSERT INTO accounts (id, owner, balance) VALUES (1, "Amira", ?), (2, "Bilel", ?), (3, "Cyrine", ?)',
    [START[1], START[2], START[3]],
  );
}

async function balances(admin) {
  const [rows] = await admin.query('SELECT id, balance FROM accounts ORDER BY id');
  return Object.fromEntries(rows.map((r) => [r.id, Number(r.balance)]));
}

// A little recorder for the "order of operations" table
function makeTimeline(admin) {
  const steps = [];
  return {
    steps,
    async add(who, operation, note = '') {
      const committed = (await balances(admin))[1];
      steps.push({ step: steps.length + 1, t1: who === 'T1' ? operation : '', t2: who === 'T2' ? operation : '', committedA: committed, note });
    },
  };
}

function summary(name, finalBalances, timeline, extra = {}) {
  const total = Object.values(finalBalances).reduce((a, b) => a + b, 0);
  const correct = [1, 2, 3].every((id) => finalBalances[id] === EXPECTED[id]);
  return { name, final: finalBalances, total, expectedTotal: TOTAL, correct, timeline: timeline.steps, ...extra };
}

// ---------------------------------------------------------------------------
// 1) No locking: read the balance, compute in the app, write it back
// ---------------------------------------------------------------------------
async function noLocking(db, admin) {
  await resetAccounts(admin);
  const t1 = await db.connect();
  const t2 = await db.connect();
  const tl = makeTimeline(admin);

  await t1.beginTransaction();
  await t2.beginTransaction();

  const [[a1]] = await t1.query('SELECT balance FROM accounts WHERE id = 1');
  await tl.add('T1', `read(A) = ${a1.balance}`);
  const [[a2]] = await t2.query('SELECT balance FROM accounts WHERE id = 1');
  await tl.add('T2', `read(A) = ${a2.balance}`, 'T2 reads the same old value');

  await t1.query('UPDATE accounts SET balance = ? WHERE id = 1', [a1.balance - 200]);
  await t1.query('UPDATE accounts SET balance = balance + 200 WHERE id = 2');
  await tl.add('T1', `write(A = ${a1.balance - 200}), B += 200`);
  await t1.commit();
  await tl.add('T1', 'COMMIT');

  await t2.query('UPDATE accounts SET balance = ? WHERE id = 1', [a2.balance - 300]);
  await t2.query('UPDATE accounts SET balance = balance + 300 WHERE id = 3');
  await tl.add('T2', `write(A = ${a2.balance - 300}), C += 300`, "overwrites T1's write: LOST UPDATE");
  await t2.commit();
  await tl.add('T2', 'COMMIT');

  return summary('No locking', await balances(admin), tl, { safe: false });
}

// ---------------------------------------------------------------------------
// 2) Shared locks only (SELECT ... FOR SHARE): both can read-lock, then
//    neither can upgrade to a write lock -> deadlock, MySQL kills one
// ---------------------------------------------------------------------------
async function sharedLocksOnly(db, admin) {
  await resetAccounts(admin);
  const t1 = await db.connect();
  const t2 = await db.connect();
  await t1.query('SET SESSION innodb_lock_wait_timeout = 5');
  await t2.query('SET SESSION innodb_lock_wait_timeout = 5');
  const tl = makeTimeline(admin);

  await t1.beginTransaction();
  await t2.beginTransaction();

  const [[a1]] = await t1.query('SELECT balance FROM accounts WHERE id = 1 FOR SHARE');
  await tl.add('T1', `S-lock(A), read(A) = ${a1.balance}`);
  const [[a2]] = await t2.query('SELECT balance FROM accounts WHERE id = 1 FOR SHARE');
  await tl.add('T2', `S-lock(A), read(A) = ${a2.balance}`, 'shared locks are compatible');

  // T1 wants to write A: needs an X-lock, but T2 holds an S-lock -> T1 waits
  const t1Write = t1.query('UPDATE accounts SET balance = ? WHERE id = 1', [a1.balance - 200]);
  await sleep(300);
  await tl.add('T1', 'write(A) → needs X-lock, WAITS for T2');

  // T2 wants to write A too: needs an X-lock, but T1 holds an S-lock -> deadlock
  let deadlock = null;
  try {
    await t2.query('UPDATE accounts SET balance = ? WHERE id = 1', [a2.balance - 300]);
  } catch (error) {
    deadlock = { code: error.code, errno: error.errno, message: error.message };
    await t2.rollback().catch(() => {});
  }
  await tl.add('T2', 'write(A) → DEADLOCK, rolled back', deadlock ? `MySQL error ${deadlock.errno} ${deadlock.code}` : 'no deadlock?');

  await t1Write;
  await t1.query('UPDATE accounts SET balance = balance + 200 WHERE id = 2');
  await t1.commit();
  await tl.add('T1', `lock granted, write(A = ${a1.balance - 200}), B += 200, COMMIT`);

  // The application has to retry T2
  await t2.beginTransaction();
  const [[again]] = await t2.query('SELECT balance FROM accounts WHERE id = 1 FOR UPDATE');
  await t2.query('UPDATE accounts SET balance = ? WHERE id = 1', [again.balance - 300]);
  await t2.query('UPDATE accounts SET balance = balance + 300 WHERE id = 3');
  await t2.commit();
  await tl.add('T2', `retry: read(A) = ${again.balance}, write(A = ${again.balance - 300}), COMMIT`);

  return summary('Shared locks only', await balances(admin), tl, { safe: false, deadlock });
}

// ---------------------------------------------------------------------------
// 3) Pessimistic locking: exclusive lock with SELECT ... FOR UPDATE
//    (accounts always locked in id order, to avoid deadlocks)
// ---------------------------------------------------------------------------
async function pessimistic(db, admin) {
  await resetAccounts(admin);
  const t1 = await db.connect();
  const t2 = await db.connect();
  const tl = makeTimeline(admin);

  await t1.beginTransaction();
  await t2.beginTransaction();

  const [r1] = await t1.query('SELECT id, balance FROM accounts WHERE id IN (1, 2) ORDER BY id FOR UPDATE');
  const a1 = r1[0].balance;
  await tl.add('T1', `X-lock(A, B), read(A) = ${a1}`);

  // T2 asks for the same lock: it has to WAIT until T1 commits
  const started = Date.now();
  let t2Done = false;
  const t2Lock = t2
    .query('SELECT id, balance FROM accounts WHERE id IN (1, 3) ORDER BY id FOR UPDATE')
    .then((res) => { t2Done = true; return res; });
  await sleep(300);
  await tl.add('T2', 'X-lock(A) requested → WAITS', t2Done ? 'did not wait?' : 'blocked by T1');
  const t2WasBlocked = !t2Done;

  await t1.query('UPDATE accounts SET balance = ? WHERE id = 1', [a1 - 200]);
  await t1.query('UPDATE accounts SET balance = balance + 200 WHERE id = 2');
  await tl.add('T1', `write(A = ${a1 - 200}), B += 200`);
  await t1.commit();
  await tl.add('T1', 'COMMIT (releases locks)');

  const [r2] = await t2Lock;
  const waitedMs = Date.now() - started;
  const a2 = r2[0].balance;
  await tl.add('T2', `lock granted, read(A) = ${a2}`, 'T2 sees the NEW value');
  await t2.query('UPDATE accounts SET balance = ? WHERE id = 1', [a2 - 300]);
  await t2.query('UPDATE accounts SET balance = balance + 300 WHERE id = 3');
  await tl.add('T2', `write(A = ${a2 - 300}), C += 300`);
  await t2.commit();
  await tl.add('T2', 'COMMIT');

  return summary('Pessimistic (exclusive lock)', await balances(admin), tl, { safe: true, t2WasBlocked, waitedMs });
}

// ---------------------------------------------------------------------------
// 4) Optimistic locking: no lock while reading, a version number is checked
//    when writing. If someone changed the row in between, retry.
// ---------------------------------------------------------------------------
async function optimistic(db, admin) {
  await resetAccounts(admin);
  const t1 = await db.connect();
  const t2 = await db.connect();
  const tl = makeTimeline(admin);
  let conflicts = 0;

  await t1.beginTransaction();
  await t2.beginTransaction();

  const [[a1]] = await t1.query('SELECT balance, version FROM accounts WHERE id = 1');
  await tl.add('T1', `read(A) = ${a1.balance}, version ${a1.version}`);
  const [[a2]] = await t2.query('SELECT balance, version FROM accounts WHERE id = 1');
  await tl.add('T2', `read(A) = ${a2.balance}, version ${a2.version}`);

  const [w1] = await t1.query(
    'UPDATE accounts SET balance = ?, version = version + 1 WHERE id = 1 AND version = ?',
    [a1.balance - 200, a1.version],
  );
  await t1.query('UPDATE accounts SET balance = balance + 200 WHERE id = 2');
  await t1.commit();
  await tl.add('T1', `write(A = ${a1.balance - 200}) if version = ${a1.version} → ${w1.affectedRows} row, COMMIT`);

  const [w2] = await t2.query(
    'UPDATE accounts SET balance = ?, version = version + 1 WHERE id = 1 AND version = ?',
    [a2.balance - 300, a2.version],
  );
  if (w2.affectedRows === 0) {
    conflicts++;
    await t2.rollback();
    await tl.add('T2', `write(A) if version = ${a2.version} → 0 rows: CONFLICT, rollback`, 'version changed since T2 read it');

    // Retry with fresh data
    await t2.beginTransaction();
    const [[fresh]] = await t2.query('SELECT balance, version FROM accounts WHERE id = 1');
    const [w3] = await t2.query(
      'UPDATE accounts SET balance = ?, version = version + 1 WHERE id = 1 AND version = ?',
      [fresh.balance - 300, fresh.version],
    );
    await t2.query('UPDATE accounts SET balance = balance + 300 WHERE id = 3');
    await t2.commit();
    await tl.add('T2', `retry: read(A) = ${fresh.balance} v${fresh.version}, write(A = ${fresh.balance - 300}) → ${w3.affectedRows} row, COMMIT`);
  }

  return summary('Optimistic (version check)', await balances(admin), tl, { safe: true, conflicts });
}

// ---------------------------------------------------------------------------
// Bonus: dirty read (T2 sees money that T1 never really committed)
// ---------------------------------------------------------------------------
async function dirtyRead(db, admin) {
  await resetAccounts(admin);
  const t1 = await db.connect();
  const reader = await db.connect();

  const results = {};
  for (const level of ['READ UNCOMMITTED', 'READ COMMITTED']) {
    await t1.beginTransaction();
    await t1.query('UPDATE accounts SET balance = balance - 200 WHERE id = 1');
    await reader.query(`SET SESSION TRANSACTION ISOLATION LEVEL ${level}`);
    const [[seen]] = await reader.query('SELECT balance FROM accounts WHERE id = 1');
    await t1.rollback(); // e.g. the transfer failed
    const [[real]] = await admin.query('SELECT balance FROM accounts WHERE id = 1');
    results[level] = { seen: Number(seen.balance), afterRollback: Number(real.balance), dirty: Number(seen.balance) !== Number(real.balance) };
  }
  return results;
}

// ---------------------------------------------------------------------------
async function main() {
  console.log('Starting a temporary MySQL server...');
  const db = await startMySQL();
  try {
    const admin = await db.connect();
    const [[{ version }]] = await admin.query('SELECT VERSION() AS version');
    const [[{ iso }]] = await admin.query('SELECT @@transaction_isolation AS iso');

    const scenarios = [];
    for (const run of [noLocking, sharedLocksOnly, pessimistic, optimistic]) {
      scenarios.push(await run(db, admin));
    }
    const dirty = await dirtyRead(db, admin);

    for (const s of scenarios) {
      console.log(`\n=== ${s.name} ===`);
      console.table(s.timeline.map(({ step, t1, t2, committedA }) => ({ step, T1: t1, T2: t2, 'A (committed)': committedA })));
      console.log(
        `Final: A=${s.final[1]} B=${s.final[2]} C=${s.final[3]}  total=${s.total} (should be ${s.expectedTotal})  →  ${s.correct ? '✅ correct' : '❌ WRONG'}`,
      );
    }
    console.log('\n=== Dirty read ===');
    console.table(dirty);

    const out = { mysqlVersion: version, defaultIsolation: iso, start: START, expected: EXPECTED, scenarios, dirtyRead: dirty, generatedAt: new Date().toISOString() };
    fs.writeFileSync(path.join(__dirname, 'results-concurrency.json'), JSON.stringify(out, null, 2));
    console.log('\nSaved demo/results-concurrency.json');
  } finally {
    await db.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
