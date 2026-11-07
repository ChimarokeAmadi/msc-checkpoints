# Concurrency Control and Distributed Database Design (Mini Bank)

This checkpoint has two parts. In the first, two people transfer money out of the same account at the same time: what goes wrong, and how do locks fix it? In the second, the bank has three branches (Tunis, Sousse and Sfax), and I plan how its data could be split and copied between them.

My answers are in **`Transactions-Distributed-DB-Checkpoint.pdf`**.

Instead of only writing the answers on paper, I tested them on a real MySQL server. I wanted to see the problem happen for myself, so every table and number in the PDF comes from these scripts.

## Running it

```bash
npm install
npm run all
```

This runs both demos and rebuilds `report/report.html`, the page the PDF is printed from. You don't need MySQL installed: the scripts start a temporary MySQL server with `mysql-memory-server`. The first time, it downloads MySQL, which takes a minute or two.

You can also run each part on its own: `npm run concurrency`, `npm run distribution` and `npm run report`.

## Part 1: what the concurrency demo does

`demo/concurrency.js` opens two connections to MySQL, one for each user. Amira's account starts with 1000. T1 sends 200 to Bilel and T2 sends 300 to Cyrine, at the same time. I control the order of every step, so the two transfers overlap in exactly the dangerous way. I ran the same transfers four ways:

- **No locking**: both read 1000, T1 writes 800, then T2 writes 700. T1's update is **lost**. Amira ends on 700 instead of 500, and the bank has 200 more money than it should. MySQL didn't give any error, which surprised me the most.
- **Shared locks only** (`FOR SHARE`): both get a read lock, then each needs a write lock and waits for the other. That's a **deadlock**. MySQL kills T2 (error 1213), and it has to be retried.
- **Exclusive locks** (`SELECT ... FOR UPDATE`, pessimistic): T2 has to **wait** until T1 commits, then reads 800 and writes 500. This one is correct, and it's the one I chose.
- **Version check** (optimistic): T2's update says "only if the version is still 0". It isn't anymore, so 0 rows change, and T2 retries with the new balance. Also correct.

It also shows a **dirty read**: at `READ UNCOMMITTED`, a reader sees 800 while T1 is still running, then T1 rolls back and the real balance is 1000.

I chose **pessimistic locking** for transfers. The two users are hitting the same account, so a conflict is expected, not rare. It's money, so a mistake is expensive, and transfers are short, so the wait is tiny. The PDF also has the order-of-operations tables, and explains with a precedence graph why the first schedule isn't serializable.

## Part 2: what the distribution demo does

`demo/distribution.js` pretends each branch is a separate server, using one MySQL database per branch (`bank_tunis`, `bank_sousse`, `bank_sfax`). It starts from 12 customers, 18 accounts and 6,000 transactions, and then:

- **Horizontal fragmentation:** splits `customers` by branch (`WHERE branch = 'Tunis'` and so on), then checks the three rules from the course. Every customer is in a fragment (*completeness*), nobody is in two (*disjointness*), and a `UNION ALL` of the three gives back the original table (*reconstruction*). A `CHECK` constraint stops a Sfax customer from being saved in the Tunis fragment.
- **Derived fragmentation:** puts accounts and transactions at the same branch as their customer.
- **Vertical fragmentation:** moves `email`, `password_hash` and `last_login` to a separate `customer_login` table, mostly for security. A `JOIN` on `customer_id` rebuilds the original exactly.
- **Replication:** copies a small customer directory to every branch. In the demo, a Tunis customer walks into the Sfax branch. Sfax finds her in its local copy, then asks the Tunis site for her balance.

My answers:

- **What to replicate:** customer info (small, read often, rarely changes) is copied to all branches. Balances are not (one exact copy at the home branch), and neither is transaction history (too big; it only goes to a central backup).
- **Allocation:** I'd use **static** allocation for transaction history. It's append-only, huge, and almost always read at the home branch, so moving it around automatically wouldn't help.

The PDF explains the reasons in more detail.

## Files

```
Transactions-Distributed-DB-Checkpoint.pdf   my answers (the deliverable)
demo/concurrency.js                          Part 1 on real MySQL
demo/distribution.js                         Part 2 on real MySQL
demo/results-*.json                          what the demos measured
demo/db.js                                   starts the temporary MySQL server
report/build-report.js                       turns the results into report/report.html
```
