// Part 2 demo: fragmenting and replicating the bank's data across the three
// branches (Tunis, Sousse, Sfax).
//
// We can't run three real servers in three cities here, so each branch is its
// own MySQL database ("site") on one server: bank_tunis, bank_sousse, bank_sfax.
// The SQL is the same as it would be on separate servers.
//
// It checks the three correctness rules of fragmentation:
//   completeness (no row lost), disjointness (no row in two fragments),
//   reconstruction (the original table can be rebuilt).
// Results are saved to demo/results-distribution.json (used by the report).
//
// Run with: npm run distribution

const fs = require('fs');
const path = require('path');
const { startMySQL } = require('./db');

const BRANCHES = ['Tunis', 'Sousse', 'Sfax'];
const site = (branch) => `bank_${branch.toLowerCase()}`;

const CUSTOMERS = [
  [1, 'Amira Ben Salah', 'Tunis', '+216 20 111 001', 'Lafayette, Tunis'],
  [2, 'Bilel Trabelsi', 'Sousse', '+216 20 111 002', 'Sahloul, Sousse'],
  [3, 'Cyrine Gharbi', 'Sfax', '+216 20 111 003', 'Sakiet Ezzit, Sfax'],
  [4, 'Dhia Mansour', 'Tunis', '+216 20 111 004', 'La Marsa, Tunis'],
  [5, 'Emna Jaziri', 'Tunis', '+216 20 111 005', 'Ariana'],
  [6, 'Fares Bouazizi', 'Sousse', '+216 20 111 006', 'Khezama, Sousse'],
  [7, 'Ghada Kallel', 'Sfax', '+216 20 111 007', 'Route de Tunis, Sfax'],
  [8, 'Hamza Dridi', 'Sfax', '+216 20 111 008', 'Sfax Centre'],
  [9, 'Ines Chaabane', 'Sousse', '+216 20 111 009', 'Hammam Sousse'],
  [10, 'Karim Zouari', 'Tunis', '+216 20 111 010', 'Menzah 6, Tunis'],
  [11, 'Lina Haddad', 'Sfax', '+216 20 111 011', 'Thyna, Sfax'],
  [12, 'Mehdi Saidi', 'Sousse', '+216 20 111 012', 'Msaken'],
];

// A small deterministic random generator, so the numbers are the same every run
function rng(seed) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

async function main() {
  console.log('Starting a temporary MySQL server...');
  const db = await startMySQL();
  const out = { branches: BRANCHES };
  try {
    const admin = await db.connect();

    // ------------------------------------------------------------------
    // The original, centralized tables (what we start from)
    // ------------------------------------------------------------------
    await admin.query('CREATE DATABASE bank_central');
    await admin.query('USE bank_central');
    await admin.query(`
      CREATE TABLE customers (
        customer_id   INT PRIMARY KEY,
        full_name     VARCHAR(80)  NOT NULL,
        branch        ENUM('Tunis','Sousse','Sfax') NOT NULL,
        phone         VARCHAR(20)  NOT NULL,
        address       VARCHAR(120) NOT NULL,
        email         VARCHAR(120) NOT NULL UNIQUE,
        password_hash CHAR(60)     NOT NULL,
        last_login    DATETIME     NULL
      )`);
    for (const [id, name, branch, phone, address] of CUSTOMERS) {
      const email = `${name.split(' ')[0].toLowerCase()}${id}@example.tn`;
      const fakeHash = `$2b$12$${'x'.repeat(53 - String(id).length)}${id}`; // placeholder, 60 chars
      await admin.query('INSERT INTO customers VALUES (?, ?, ?, ?, ?, ?, ?, NOW())', [id, name, branch, phone, address, email, fakeHash]);
    }

    await admin.query(`
      CREATE TABLE accounts (
        account_id  INT PRIMARY KEY,
        customer_id INT NOT NULL REFERENCES customers(customer_id),
        balance     DECIMAL(12,2) NOT NULL
      )`);
    await admin.query(`
      CREATE TABLE transactions (
        tx_id      INT PRIMARY KEY,
        account_id INT NOT NULL REFERENCES accounts(account_id),
        amount     DECIMAL(12,2) NOT NULL,
        created_at DATETIME NOT NULL
      )`);

    const rand = rng(42);
    let accountId = 100;
    for (const [customerId] of CUSTOMERS) {
      const howMany = 1 + Math.floor(rand() * 2); // 1 or 2 accounts each
      for (let i = 0; i < howMany; i++) {
        accountId++;
        await admin.query('INSERT INTO accounts VALUES (?, ?, ?)', [accountId, customerId, Math.round(rand() * 500000) / 100]);
      }
    }
    const [accountRows] = await admin.query('SELECT account_id FROM accounts');
    const txRows = [];
    for (let tx = 1; tx <= 6000; tx++) {
      const acc = accountRows[Math.floor(rand() * accountRows.length)].account_id;
      const amount = Math.round((rand() * 2 - 1) * 50000) / 100;
      const day = new Date(Date.UTC(2026, 0, 1) + Math.floor(rand() * 300) * 86400000).toISOString().slice(0, 10);
      txRows.push([tx, acc, amount, `${day} 10:00:00`]);
    }
    await admin.query('INSERT INTO transactions VALUES ?', [txRows]);

    const count = async (sql) => (await admin.query(sql))[0][0].n;
    out.central = {
      customers: await count('SELECT COUNT(*) n FROM bank_central.customers'),
      accounts: await count('SELECT COUNT(*) n FROM bank_central.accounts'),
      transactions: await count('SELECT COUNT(*) n FROM bank_central.transactions'),
    };

    // ------------------------------------------------------------------
    // 1. HORIZONTAL fragmentation of customers by branch
    //    Customers_Tunis = σ branch='Tunis' (Customers), and so on.
    //    Combined with the vertical split below: the login columns stay out.
    // ------------------------------------------------------------------
    const fragmentSQL = [];
    for (const b of BRANCHES) {
      await admin.query(`CREATE DATABASE ${site(b)}`);
      const sql = `CREATE TABLE ${site(b)}.customers AS
  SELECT customer_id, full_name, branch, phone, address
  FROM bank_central.customers
  WHERE branch = '${b}'`;
      fragmentSQL.push(sql);
      await admin.query(sql);
      await admin.query(`ALTER TABLE ${site(b)}.customers ADD PRIMARY KEY (customer_id),
        ADD CONSTRAINT chk_branch CHECK (branch = '${b}')`);
    }

    const fragments = {};
    for (const b of BRANCHES) {
      const [rows] = await admin.query(`SELECT customer_id, full_name FROM ${site(b)}.customers ORDER BY customer_id`);
      fragments[b] = rows;
    }
    const allIds = Object.values(fragments).flat().map((r) => r.customer_id);
    const [centralIds] = await admin.query('SELECT customer_id FROM bank_central.customers ORDER BY customer_id');

    // Reconstruction: UNION ALL of the fragments must equal the original
    const [rebuilt] = await admin.query(`
      SELECT customer_id, full_name, branch, phone, address FROM bank_tunis.customers
      UNION ALL SELECT customer_id, full_name, branch, phone, address FROM bank_sousse.customers
      UNION ALL SELECT customer_id, full_name, branch, phone, address FROM bank_sfax.customers
      ORDER BY customer_id`);
    const [original] = await admin.query(
      'SELECT customer_id, full_name, branch, phone, address FROM bank_central.customers ORDER BY customer_id',
    );

    // The CHECK constraint stops a Sfax customer being inserted at the Tunis site
    let wrongSiteError = null;
    try {
      await admin.query("INSERT INTO bank_tunis.customers VALUES (99, 'Test', 'Sfax', '-', '-')");
    } catch (e) {
      wrongSiteError = e.code;
    }

    out.horizontal = {
      sql: fragmentSQL,
      fragments: Object.fromEntries(BRANCHES.map((b) => [b, fragments[b].map((r) => `${r.customer_id} ${r.full_name}`)])),
      counts: Object.fromEntries(BRANCHES.map((b) => [b, fragments[b].length])),
      completeness: allIds.length === centralIds.length && centralIds.every((r) => allIds.includes(r.customer_id)),
      disjointness: new Set(allIds).size === allIds.length,
      reconstruction: JSON.stringify(rebuilt) === JSON.stringify(original),
      wrongSiteInsertRejected: wrongSiteError,
    };

    // ------------------------------------------------------------------
    // 2. VERTICAL fragmentation: login data in its own table
    //    customer_login = π customer_id, email, password_hash, last_login (Customers)
    //    It lives in a separate, more protected database (the auth service).
    // ------------------------------------------------------------------
    await admin.query('CREATE DATABASE bank_auth');
    const loginSQL = `CREATE TABLE bank_auth.customer_login AS
  SELECT customer_id, email, password_hash, last_login
  FROM bank_central.customers`;
    await admin.query(loginSQL);
    await admin.query('ALTER TABLE bank_auth.customer_login ADD PRIMARY KEY (customer_id), ADD UNIQUE (email)');

    const [joined] = await admin.query(`
      SELECT p.customer_id, p.full_name, p.branch, p.phone, p.address, l.email, l.password_hash
      FROM (SELECT * FROM bank_tunis.customers UNION ALL SELECT * FROM bank_sousse.customers
            UNION ALL SELECT * FROM bank_sfax.customers) AS p
      JOIN bank_auth.customer_login AS l ON l.customer_id = p.customer_id
      ORDER BY p.customer_id`);
    const [originalFull] = await admin.query(
      'SELECT customer_id, full_name, branch, phone, address, email, password_hash FROM bank_central.customers ORDER BY customer_id',
    );
    const [[siteColumns]] = await admin.query(
      "SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) AS cols FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'bank_tunis' AND TABLE_NAME = 'customers'",
    );
    const [[loginColumns]] = await admin.query(
      "SELECT GROUP_CONCAT(COLUMN_NAME ORDER BY ORDINAL_POSITION) AS cols FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = 'bank_auth' AND TABLE_NAME = 'customer_login'",
    );
    out.vertical = {
      sql: loginSQL,
      branchColumns: siteColumns.cols.split(','),
      loginColumns: loginColumns.cols.split(','),
      reconstruction: JSON.stringify(joined) === JSON.stringify(originalFull),
    };

    // ------------------------------------------------------------------
    // 3. Derived horizontal fragmentation: accounts and transactions follow
    //    their customer's branch (accounts ⋉ customers_branch)
    // ------------------------------------------------------------------
    const derived = {};
    for (const b of BRANCHES) {
      await admin.query(`CREATE TABLE ${site(b)}.accounts AS
        SELECT a.* FROM bank_central.accounts a JOIN ${site(b)}.customers c ON c.customer_id = a.customer_id`);
      await admin.query(`CREATE TABLE ${site(b)}.transactions AS
        SELECT t.* FROM bank_central.transactions t JOIN ${site(b)}.accounts a ON a.account_id = t.account_id`);
      const [[{ n: accounts }]] = await admin.query(`SELECT COUNT(*) n FROM ${site(b)}.accounts`);
      const [[{ n: transactions }]] = await admin.query(`SELECT COUNT(*) n FROM ${site(b)}.transactions`);
      derived[b] = { accounts, transactions };
    }
    out.derived = {
      perBranch: derived,
      accountsComplete: BRANCHES.reduce((s, b) => s + derived[b].accounts, 0) === out.central.accounts,
      transactionsComplete: BRANCHES.reduce((s, b) => s + derived[b].transactions, 0) === out.central.transactions,
    };

    // ------------------------------------------------------------------
    // 4. Replication: a small customer DIRECTORY (id, name, home branch) is
    //    copied to every site, so any branch can find any customer and know
    //    where their data lives. Balances are NOT copied.
    // ------------------------------------------------------------------
    for (const b of BRANCHES) {
      await admin.query(`CREATE TABLE ${site(b)}.customer_directory AS
        SELECT customer_id, full_name, branch AS home_branch FROM bank_central.customers`);
    }
    // Example: Amira (Tunis customer) walks into the Sfax branch
    const [[found]] = await admin.query('SELECT * FROM bank_sfax.customer_directory WHERE customer_id = 1');
    const [[balance]] = await admin.query(
      `SELECT SUM(balance) AS total FROM ${site(found.home_branch)}.accounts WHERE customer_id = 1`,
    );
    out.replication = {
      directoryRowsPerSite: Object.fromEntries(
        await Promise.all(BRANCHES.map(async (b) => [b, (await admin.query(`SELECT COUNT(*) n FROM ${site(b)}.customer_directory`))[0][0].n])),
      ),
      example: { visitingBranch: 'Sfax', customer: found.full_name, homeBranch: found.home_branch, balanceReadFrom: site(found.home_branch), balance: Number(balance.total) },
    };

    // ------------------------------------------------------------------
    console.log('\nHorizontal fragments:', out.horizontal.counts);
    console.log('  completeness:', out.horizontal.completeness, '| disjointness:', out.horizontal.disjointness, '| reconstruction:', out.horizontal.reconstruction);
    console.log('  inserting a Sfax customer into the Tunis fragment →', out.horizontal.wrongSiteInsertRejected);
    console.log('\nVertical split:');
    console.log('  branch sites keep:', out.vertical.branchColumns.join(', '));
    console.log('  bank_auth.customer_login:', out.vertical.loginColumns.join(', '));
    console.log('  reconstruction by JOIN:', out.vertical.reconstruction);
    console.log('\nDerived fragmentation (accounts / transactions per branch):');
    console.table(out.derived.perBranch);
    console.log('  complete:', out.derived.accountsComplete, out.derived.transactionsComplete);
    console.log('\nReplicated customer directory rows per site:', out.replication.directoryRowsPerSite);
    console.log('  example:', out.replication.example);

    fs.writeFileSync(path.join(__dirname, 'results-distribution.json'), JSON.stringify(out, null, 2));
    console.log('\nSaved demo/results-distribution.json');
  } finally {
    await db.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
