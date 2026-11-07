// Builds report/report.html from the demo results.
// Run the demos first (npm run concurrency && npm run distribution), then:
//   node report/build-report.js

const fs = require('fs');
const path = require('path');

const AUTHOR = 'Chimaroke Amadi';
const conc = require('../demo/results-concurrency.json');
const dist = require('../demo/results-distribution.json');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const money = (n) => `${Number(n).toLocaleString('en-US')} TND`;
const byName = (start) => conc.scenarios.find((s) => s.name.startsWith(start));

const noLock = byName('No locking');
const shared = byName('Shared');
const pess = byName('Pessimistic');
const opt = byName('Optimistic');

const ok = (b) => (b ? '<span class="good">✔ yes</span>' : '<span class="bad">✘ no</span>');

function timelineTable(scenario, caption) {
  const rows = scenario.timeline
    .map(
      (s) => `<tr>
        <td class="num">${s.step}</td>
        <td>${esc(s.t1)}</td>
        <td>${esc(s.t2)}</td>
        <td class="num">${s.committedA}</td>
        <td class="note">${esc(s.note)}</td>
      </tr>`,
    )
    .join('');
  const total = scenario.total;
  return `<table class="timeline">
    <caption>${caption}</caption>
    <thead><tr><th>#</th><th>T1: Amira → Bilel (200)</th><th>T2: Amira → Cyrine (300)</th><th>A in DB</th><th>Note</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr><td colspan="5">
      Final: A = <b>${scenario.final[1]}</b>, B = ${scenario.final[2]}, C = ${scenario.final[3]} ·
      total money = <b>${total}</b> (must stay ${scenario.expectedTotal}) ·
      Schedule safe? <b>${scenario.safe ? '<span class="good">SAFE</span>' : scenario.deadlock ? '<span class="bad">NOT SAFE as written</span>: it deadlocked, and only ended correct because MySQL rolled T2 back and the app retried it' : '<span class="bad">NOT SAFE</span>'}</b>
    </td></tr></tfoot>
  </table>`;
}

// ---------- Diagrams ----------
function precedenceGraph() {
  return `<svg viewBox="0 0 330 120" class="diagram small" role="img" aria-label="Precedence graph with a cycle between T1 and T2">
    <defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#b91c1c"/></marker></defs>
    <circle cx="70" cy="60" r="28" fill="#fee2e2" stroke="#b91c1c" stroke-width="1.5"/><text x="70" y="65" text-anchor="middle" class="node">T1</text>
    <circle cx="260" cy="60" r="28" fill="#fee2e2" stroke="#b91c1c" stroke-width="1.5"/><text x="260" y="65" text-anchor="middle" class="node">T2</text>
    <path d="M98,48 Q165,10 232,48" fill="none" stroke="#b91c1c" stroke-width="1.6" marker-end="url(#arr)"/>
    <text x="165" y="22" text-anchor="middle" class="edge">r1(A) before w2(A)</text>
    <path d="M232,72 Q165,110 98,72" fill="none" stroke="#b91c1c" stroke-width="1.6" marker-end="url(#arr)"/>
    <text x="165" y="112" text-anchor="middle" class="edge">r2(A) before w1(A)</text>
  </svg>`;
}

function architecture() {
  const siteBox = (x, name, color, counts) => `
    <g transform="translate(${x},40)">
      <rect width="220" height="250" rx="12" fill="${color}" stroke="#334155" stroke-width="1.2"/>
      <text x="110" y="26" text-anchor="middle" class="site">${name} branch</text>
      <text x="110" y="42" text-anchor="middle" class="sub">bank_${name.toLowerCase()}</text>
      ${[
        ['customers', `σ branch='${name}'`, `${counts.customers} rows`, '#fff'],
        ['accounts', 'derived (by customer)', `${counts.accounts} rows`, '#fff'],
        ['transactions', 'derived · static', `${counts.transactions} rows`, '#fff'],
        ['customer_directory', 'REPLICA (all customers)', `${dist.central.customers} rows`, '#fef9c3'],
      ]
        .map(
          ([t, d, n, fill], i) => `
        <g transform="translate(14,${58 + i * 46})">
          <rect width="192" height="38" rx="6" fill="${fill}" stroke="#64748b"/>
          <text x="8" y="16" class="tbl">${t}</text>
          <text x="8" y="30" class="sub">${d}</text>
          <text x="184" y="16" text-anchor="end" class="sub">${n}</text>
        </g>`,
        )
        .join('')}
    </g>`;
  const c = (b) => ({
    customers: dist.horizontal.counts[b],
    accounts: dist.derived.perBranch[b].accounts,
    transactions: dist.derived.perBranch[b].transactions,
  });
  return `<svg viewBox="0 0 740 420" class="diagram" role="img" aria-label="Data placement across Tunis, Sousse and Sfax">
    ${siteBox(10, 'Tunis', '#dbeafe', c('Tunis'))}
    ${siteBox(260, 'Sousse', '#dcfce7', c('Sousse'))}
    ${siteBox(510, 'Sfax', '#ffedd5', c('Sfax'))}
    <g transform="translate(230,330)">
      <rect width="280" height="70" rx="12" fill="#ede9fe" stroke="#334155" stroke-width="1.2"/>
      <text x="140" y="24" text-anchor="middle" class="site">bank_auth · customer_login</text>
      <text x="140" y="42" text-anchor="middle" class="sub">vertical fragment: email, password_hash, last_login</text>
      <text x="140" y="58" text-anchor="middle" class="sub">replicated to every branch (read-only copies)</text>
    </g>
    <line x1="120" y1="290" x2="250" y2="335" stroke="#7c3aed" stroke-dasharray="5 4"/>
    <line x1="370" y1="290" x2="370" y2="330" stroke="#7c3aed" stroke-dasharray="5 4"/>
    <line x1="620" y1="290" x2="490" y2="335" stroke="#7c3aed" stroke-dasharray="5 4"/>
    <text x="370" y="22" text-anchor="middle" class="sub">Solid tables = this branch's fragment (primary copy) · yellow = replicated to all branches</text>
  </svg>`;
}

// ---------- Report ----------
const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Concurrency Control and Distributed Database Design</title>
<style>
  @page { size: A4; margin: 16mm 15mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, Roboto, sans-serif; color: #1e293b; font-size: 10.4pt; line-height: 1.5; margin: 0; }
  h1 { font-size: 21pt; margin: 0 0 4px; color: #0f172a; }
  h2 { font-size: 15pt; margin: 26px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #2563eb; color: #1e3a8a; break-after: avoid; }
  h3 { font-size: 12pt; margin: 18px 0 6px; color: #0f172a; break-after: avoid; }
  p { margin: 6px 0; }
  .meta { color: #64748b; margin-bottom: 14px; }
  .lead { background: #eff6ff; border-left: 4px solid #2563eb; padding: 10px 14px; border-radius: 4px; }
  .answer { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 8px 14px; border-radius: 4px; margin: 10px 0; break-inside: avoid; }
  .warn { background: #fef2f2; border-left: 4px solid #dc2626; padding: 8px 14px; border-radius: 4px; margin: 10px 0; break-inside: avoid; }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; font-size: 9.2pt; break-inside: avoid; }
  caption { text-align: left; font-weight: 600; margin-bottom: 4px; color: #334155; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; vertical-align: top; text-align: left; }
  th { background: #f1f5f9; }
  td.num, th.num { text-align: center; white-space: nowrap; }
  td.note { color: #b45309; font-size: 8.6pt; }
  tfoot td { background: #f8fafc; }
  .good { color: #15803d; font-weight: 600; }
  .bad { color: #b91c1c; font-weight: 600; }
  code, pre { font-family: 'SF Mono', Menlo, Consolas, monospace; font-size: 8.6pt; }
  code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; }
  pre { background: #0f172a; color: #e2e8f0; padding: 10px 12px; border-radius: 6px; white-space: pre-wrap; break-inside: avoid; margin: 8px 0; }
  .diagram { width: 100%; height: auto; display: block; margin: 8px auto; break-inside: avoid; }
  .diagram.small { width: 60%; }
  .diagram .node { font: 700 15px sans-serif; fill: #7f1d1d; }
  .diagram .edge { font: 11px sans-serif; fill: #7f1d1d; }
  .diagram .site { font: 700 14px sans-serif; fill: #0f172a; }
  .diagram .tbl { font: 700 11.5px monospace; fill: #0f172a; }
  .diagram .sub { font: 10px sans-serif; fill: #475569; }
  .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .matrix td, .matrix th { text-align: center; }
  .pagebreak { break-before: page; }
  footer { margin-top: 24px; color: #64748b; font-size: 8.6pt; border-top: 1px solid #e2e8f0; padding-top: 6px; }
</style>
</head>
<body>

<h1>Concurrency Control &amp; Distributed Database Design</h1>
<div class="meta">A mini banking system · ${AUTHOR} · GoMyCode MSC checkpoint · ${new Date(conc.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</div>

<p class="lead">I didn't want to answer only on paper, so I ran every scenario in this report on a real
<b>MySQL ${esc(conc.mysqlVersion)}</b> (InnoDB) server. Two connections played the two users, and I forced the
operations into the exact order shown in each table. All balances and timelines below are the real results,
generated by <code>demo/concurrency.js</code> and <code>demo/distribution.js</code>.</p>

<h2>Part 1: Transaction Management</h2>

<h3>The scenario</h3>
<p>The <code>accounts</code> table starts with three accounts: <b>A</b> (Amira) = ${money(conc.start[1])},
<b>B</b> (Bilel) = ${money(conc.start[2])} and <b>C</b> (Cyrine) = ${money(conc.start[3])}. Two transfers start at the same time, and both take money from <b>the same account A</b>:</p>
<ul>
  <li><b>T1</b>: transfer 200 from A to B</li>
  <li><b>T2</b>: transfer 300 from A to C</li>
</ul>
<p>Whatever order they run in, the correct result is A = <b>${conc.expected[1]}</b>, B = ${conc.expected[2]}, C = ${conc.expected[3]}.
The bank's total money must stay at <b>${noLock.expectedTotal}</b>, because a transfer only moves money and never creates it.</p>

<h3>1. The concurrency issue: a lost update</h3>
<p>A transfer is a <i>read-modify-write</i>: read A's balance, subtract the amount in the application, then write the new balance.
If both transactions read A <b>before</b> either one writes, they both start from 1000. T1 writes 800, then T2 writes 700
and <b>overwrites</b> T1's update, as if T1 had never touched account A. This is the <b>lost update</b> problem.</p>

${timelineTable(noLock, 'Schedule 1: no locking (real run)')}

<div class="warn"><b>Result:</b> A ended on <b>${noLock.final[1]}</b> instead of ${conc.expected[1]}, but B and C still got their money.
The bank's total went from ${noLock.expectedTotal} to <b>${noLock.total}</b>: <b>${noLock.total - noLock.expectedTotal} TND appeared out of nowhere</b>.
MySQL raised no error. Its default isolation level (<code>${esc(conc.defaultIsolation)}</code>) does not stop this pattern
when the new value is calculated in the application.</div>

<p><b>Another issue I tested: the dirty read.</b> If a user viewing balances can read <i>uncommitted</i> data, they might see money
that never really moved. While T1 was in progress, a reader at <code>READ UNCOMMITTED</code> saw A = <b>${conc.dirtyRead['READ UNCOMMITTED'].seen}</b>.
Then T1 rolled back, and the real balance was ${conc.dirtyRead['READ UNCOMMITTED'].afterRollback}. At <code>READ COMMITTED</code> or higher, the reader saw
${conc.dirtyRead['READ COMMITTED'].seen}, which was correct. So <b>"view balance" must never run at READ UNCOMMITTED</b>.</p>

<h3>2. The locking mechanism</h3>
<div class="two">
<div>
<p>There are two kinds of locks:</p>
<ul>
  <li><b>Shared lock (S)</b> for reading: many transactions can hold one at the same time.</li>
  <li><b>Exclusive lock (X)</b> for writing: only one transaction can hold it, and it blocks both S and X locks from others.</li>
</ul>
</div>
<table class="matrix">
  <caption>Lock compatibility</caption>
  <tr><th>held \\ requested</th><th>S</th><th>X</th></tr>
  <tr><th>S</th><td class="good">✔</td><td class="bad">✘ wait</td></tr>
  <tr><th>X</th><td class="bad">✘ wait</td><td class="bad">✘ wait</td></tr>
</table>
</div>

<div class="answer"><b>My proposal:</b>
<ul>
  <li><b>Transfers</b> take an <b>exclusive (X) lock</b> on <i>both</i> account rows <i>before reading</i> them, with <code>SELECT … FOR UPDATE</code>.
They keep the locks until <code>COMMIT</code> (strict two-phase locking).</li>
  <li><b>Viewing a balance</b> only needs a <b>shared (S) lock</b> (<code>SELECT … FOR SHARE</code>), or simply a normal committed read.</li>
  <li>Accounts are always locked in the <b>same order (smallest id first)</b>. Then two opposite transfers (A→B and B→A) can't deadlock each other.</li>
</ul></div>

<pre>START TRANSACTION;
-- lock both rows, smallest id first
SELECT id, balance FROM accounts WHERE id IN (:from, :to) ORDER BY id FOR UPDATE;
-- (in the app: check that balance(:from) >= :amount, otherwise ROLLBACK)
UPDATE accounts SET balance = balance - :amount WHERE id = :from;
UPDATE accounts SET balance = balance + :amount WHERE id = :to;
COMMIT;   -- releases the locks</pre>

<p><b>Why not shared locks alone?</b> I tried it. Both transactions got an S-lock on A, because S-locks are compatible. Then each one needed to
upgrade to an X-lock to write, and each was waiting for the other. MySQL detected the
<b>deadlock</b>${shared.deadlock ? ` (error ${shared.deadlock.errno} <code>${esc(shared.deadlock.code)}</code>)` : ''} and rolled T2 back. The result was correct after the retry,
but only because MySQL broke the deadlock. For read-modify-write, the lock has to be exclusive <b>from the start</b>.</p>

${timelineTable(shared, 'Shared locks only (real run): deadlock, then T2 retries')}

<h3>3. Pessimistic or optimistic?</h3>
<table>
  <thead><tr><th></th><th>Pessimistic (lock first)</th><th>Optimistic (check at the end)</th></tr></thead>
  <tbody>
    <tr><td><b>How</b></td><td><code>SELECT … FOR UPDATE</code>: others wait</td><td>a <code>version</code> column: <code>UPDATE … WHERE version = :readVersion</code></td></tr>
    <tr><td><b>On conflict</b></td><td>T2 waited ${pess.waitedMs} ms, then continued with the new balance</td><td>T2's update matched 0 rows → rollback + ${opt.conflicts} retry</td></tr>
    <tr><td><b>Final result</b></td><td>A = ${pess.final[1]} · ${ok(pess.correct)}</td><td>A = ${opt.final[1]} · ${ok(opt.correct)}</td></tr>
    <tr><td><b>Best when</b></td><td>conflicts are likely and a failure is expensive</td><td>conflicts are rare (e.g. editing a profile)</td></tr>
  </tbody>
</table>

<div class="answer"><b>I would use pessimistic locking</b> for transfers, for four reasons:
<ul>
  <li><b>Conflict is part of the scenario.</b> Two users are hitting the <i>same account</i>. With optimistic locking, one of them
  is guaranteed to fail and redo the work, and under heavy load this could keep happening.</li>
  <li><b>It's money.</b> The cost of getting it wrong is very high. Pessimistic locking makes it impossible for two transfers
  to work on the same balance at the same time. Optimistic locking only works if <i>every</i> piece of code remembers the version check.</li>
  <li><b>Transfers are short</b>: two rows, a few milliseconds. The locks are held very briefly, so waiting is cheap (here it was ${pess.waitedMs} ms,
  only because I paused T1 on purpose).</li>
  <li><b>The user experience is simpler.</b> T2 just waits a moment. It doesn't get a "please try again" error.</li>
</ul>
I'd keep optimistic locking for low-conflict data, like a customer updating their address.</div>

<h3>4. Order of operations: is the schedule safe?</h3>
<p>Schedule 1 (no locking) is shown above. Written in short form, it is <code>r1(A) r2(A) w1(A) w2(A)</code>.
It is <b>not conflict-serializable</b>: <code>r1(A)</code> comes before <code>w2(A)</code>, which gives an edge T1 → T2, and <code>r2(A)</code>
comes before <code>w1(A)</code>, which gives an edge T2 → T1. The precedence graph has a <b>cycle</b>, so no serial order gives the same result. <b>Not safe.</b></p>
${precedenceGraph()}
<p>Schedule 2 uses my exclusive locks. T2's lock request <b>waits</b>, so it reads A only after T1 commits. The schedule becomes equivalent
to the serial order <b>T1 → T2</b>. <b>Safe.</b></p>
${timelineTable(pess, 'Schedule 2: exclusive locks, SELECT … FOR UPDATE (real run)')}

<table>
  <caption>Summary of the four strategies I ran</caption>
  <thead><tr><th>Strategy</th><th>Final A</th><th>Total money</th><th>Correct?</th><th>What happened</th></tr></thead>
  <tbody>
    <tr><td>No locking</td><td class="num">${noLock.final[1]}</td><td class="num">${noLock.total}</td><td>${ok(noLock.correct)}</td><td>lost update</td></tr>
    <tr><td>Shared locks only</td><td class="num">${shared.final[1]}</td><td class="num">${shared.total}</td><td>${ok(shared.correct)}</td><td>deadlock, T2 rolled back and retried</td></tr>
    <tr><td><b>Exclusive locks (pessimistic)</b></td><td class="num">${pess.final[1]}</td><td class="num">${pess.total}</td><td>${ok(pess.correct)}</td><td>T2 waited for T1</td></tr>
    <tr><td>Version check (optimistic)</td><td class="num">${opt.final[1]}</td><td class="num">${opt.total}</td><td>${ok(opt.correct)}</td><td>T2 detected the conflict and retried</td></tr>
  </tbody>
</table>

<h2 class="pagebreak">Part 2: Distributed Database Planning</h2>
<p>The bank has three branches: <b>Tunis, Sousse and Sfax</b>. In my demo, each branch is its own MySQL database (a "site"):
<code>bank_tunis</code>, <code>bank_sousse</code> and <code>bank_sfax</code>. The login data goes in <code>bank_auth</code>. I started from a central database with
${dist.central.customers} customers, ${dist.central.accounts} accounts and ${dist.central.transactions.toLocaleString('en-US')} transactions, and split it.</p>

${architecture()}

<h3>1. Horizontal fragmentation of Customers by branch</h3>
<p>Each customer belongs to a <b>home branch</b>, the branch where they opened their account. I split the rows with one predicate per branch.
Each fragment is a <i>selection</i> of the Customers table:</p>
<pre>Customers_Tunis  = σ branch = 'Tunis'  (Customers)
Customers_Sousse = σ branch = 'Sousse' (Customers)
Customers_Sfax   = σ branch = 'Sfax'   (Customers)

${esc(dist.horizontal.sql[0])};</pre>
<p>Each fragment is stored at its own branch, so most work (opening accounts, deposits, local customers asking for their balance)
uses <b>only local data</b>, with no network trip. I also added <code>CHECK (branch = 'Tunis')</code> to the Tunis fragment. When I tried to insert a Sfax
customer there, MySQL refused (<code>${esc(dist.horizontal.wrongSiteInsertRejected)}</code>).</p>

<table>
  <caption>The fragments in the demo, and the three correctness rules</caption>
  <thead><tr>${dist.branches.map((b) => `<th>${b} (${dist.horizontal.counts[b]})</th>`).join('')}</tr></thead>
  <tbody><tr>${dist.branches.map((b) => `<td>${dist.horizontal.fragments[b].map(esc).join('<br>')}</td>`).join('')}</tr></tbody>
  <tfoot><tr><td colspan="3">
    <b>Completeness</b> (every customer is in a fragment): ${ok(dist.horizontal.completeness)} ·
    <b>Disjointness</b> (no customer in two fragments): ${ok(dist.horizontal.disjointness)} ·
    <b>Reconstruction</b> (<code>UNION ALL</code> of the 3 = original table): ${ok(dist.horizontal.reconstruction)}
  </td></tr></tfoot>
</table>

<p><b>Accounts</b> and <b>transaction history</b> follow the same split through <b>derived horizontal fragmentation</b>: an account is stored
with its owner, and a transaction is stored with its account. This keeps a customer's data together at one site.</p>
<table>
  <thead><tr><th>Site</th><th>Customers</th><th>Accounts</th><th>Transactions</th></tr></thead>
  <tbody>${dist.branches
    .map((b) => `<tr><td>${b}</td><td class="num">${dist.horizontal.counts[b]}</td><td class="num">${dist.derived.perBranch[b].accounts}</td><td class="num">${dist.derived.perBranch[b].transactions.toLocaleString('en-US')}</td></tr>`)
    .join('')}
  <tr><th>Total</th><th class="num">${dist.central.customers}</th><th class="num">${dist.central.accounts} ${dist.derived.accountsComplete ? '✔' : '✘'}</th><th class="num">${dist.central.transactions.toLocaleString('en-US')} ${dist.derived.transactionsComplete ? '✔' : '✘'}</th></tr></tbody>
</table>

<h3>2. Vertical fragmentation: the login information</h3>
<div class="answer">I would move the <b>login information (<code>email</code>, <code>password_hash</code>, <code>last_login</code>)</b> into its own table,
<code>customer_login</code>. It keeps the key <code>customer_id</code> so the two parts can be joined back.</div>
<pre>${esc(dist.vertical.sql)};</pre>
<ul>
  <li><b>Security:</b> credentials are the most sensitive data. In a separate table (here, a separate database), they can have stricter
  permissions and encryption, and branch staff who look up customer profiles never touch them.</li>
  <li><b>Different use:</b> login data is read on <i>every</i> login, from anywhere (mobile app, any branch). The profile (address, phone)
  is read much less often, and mostly at the home branch.</li>
  <li><b>Not tied to a branch:</b> a customer should be able to log in from any city, so this part is treated differently (see replication below).</li>
</ul>
<p>Branch sites keep: <code>${dist.vertical.branchColumns.join(', ')}</code>. <code>bank_auth.customer_login</code> keeps:
<code>${dist.vertical.loginColumns.join(', ')}</code>. Joining the two on <code>customer_id</code> gave back the original table exactly:
${ok(dist.vertical.reconstruction)} (a <i>lossless</i> vertical split).</p>

<h3>3. What should be replicated to all branches?</h3>
<table>
  <thead><tr><th>Data</th><th>Replicate to all 3 branches?</th><th>Why</th></tr></thead>
  <tbody>
    <tr><td><b>Customer info</b><br>(a directory: id, name, home branch; and the login data)</td><td class="good">Yes</td>
      <td>It's <b>small</b>, it's <b>read all the time</b> (identifying a customer, logging in), and it <b>rarely changes</b>.
      With a copy everywhere, any branch can serve any customer, and it knows <i>where</i> that customer's accounts live. The rare updates
      go to one primary copy and are sent to the others. A few seconds of delay is fine for a name or a phone number.</td></tr>
    <tr><td><b>Account balances</b></td><td class="bad">No</td>
      <td>Balances <b>change with every transfer</b> and must <b>always be exact</b>. If all three branches had a copy, every transfer would
      have to update three sites at once (with two-phase commit), which is slow. And if a network link went down, two branches could
      accept withdrawals from different copies, so money could be spent twice. I keep <b>one primary copy at the home branch</b>
      (plus a backup standby for failures, not used for writes).</td></tr>
    <tr><td><b>Transaction history</b></td><td class="bad">No (not to every branch)</td>
      <td>It's by far the <b>largest</b> data set (${dist.central.transactions.toLocaleString('en-US')} rows for ${dist.central.customers} customers in my demo)
      and it <b>grows forever</b>. Each customer's history is mostly needed at their home branch. It's append-only, so I'd only copy it
      <b>asynchronously to one central backup/audit site</b>, not to every branch.</td></tr>
  </tbody>
</table>
<p>Here's how the directory is used in the demo. ${esc(dist.replication.example.customer)}, a ${esc(dist.replication.example.homeBranch)} customer, walks into the
<b>${esc(dist.replication.example.visitingBranch)}</b> branch. The local copy of <code>customer_directory</code> (${dist.replication.directoryRowsPerSite.Sfax} rows at every site)
finds her straight away and says her home branch is ${esc(dist.replication.example.homeBranch)}. The balance query is then sent to
<code>${esc(dist.replication.example.balanceReadFrom)}</code> (${money(dist.replication.example.balance)}), the only place the real balance is stored.</p>

<h3>4. Static or dynamic allocation for transaction history?</h3>
<div class="answer"><b>Static allocation.</b> Each transaction is stored at its account's home branch, decided once when the system is designed.</div>
<ul>
  <li><b>The access pattern is predictable.</b> History is almost always read by the account owner's branch. We know this in advance, so there's
  nothing to gain from moving data around automatically.</li>
  <li><b>The data is append-only and huge.</b> Old transactions are never updated. Dynamic allocation would keep moving large amounts
  of rows between cities, using network bandwidth and creating risk for no real benefit.</li>
  <li><b>It's simpler and easier to audit.</b> Everyone (the queries, the auditors, the backup plan) knows exactly where a transaction lives.</li>
</ul>
<p>Dynamic allocation would only make sense if usage changed a lot, for example if many customers moved between cities. Even then, I'd handle it
with an occasional planned move of that customer's fragment rather than automatic, continuous reallocation.</p>

<h2>What I learned</h2>
<p>The biggest surprise was that the lost update happened <b>silently</b>. MySQL gave no error or warning, and the bank simply ended up with
${noLock.total - noLock.expectedTotal} TND that shouldn't exist. Transactions alone don't protect you. You have to choose the right locks (here, an exclusive lock taken before
reading), or check a version number. I also learned that shared locks can make things <i>worse</i> for read-modify-write, because they lead to deadlocks.</p>
<p>For the distributed part, the main idea is to <b>keep data where it's used</b>: fragment customers, accounts and history by branch. Then <b>replicate only
what is small, read often and rarely changed</b>, which is the customer directory and login data. Balances need one exact copy, and history is too big
and too local to copy everywhere.</p>

<footer>
  Generated from real runs on MySQL ${esc(conc.mysqlVersion)} (InnoDB, default isolation ${esc(conc.defaultIsolation)}), using
  <code>demo/concurrency.js</code> and <code>demo/distribution.js</code>. Run <code>npm run all</code> to reproduce.
</footer>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'report.html'), html);
console.log('Wrote report/report.html');
