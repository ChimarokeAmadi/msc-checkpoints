# SQL to NoSQL Migration with DLoader

This checkpoint asks about migrating data from a SQL database to a NoSQL database with a tool called **DLoader**. My answers to all nine sections are in **`SQL-to-NoSQL-Migration-DLoader.pdf`**.

## What I found out about DLoader

When I researched DLoader, I found that it isn't a product you can download. It comes from a research paper:

> K. Rajaram, P. Sharma, S. Selvakumar, *"DLoader: Migration of Data from SQL to NoSQL Databases"*, Proceedings of the International Conference on Cognitive and Intelligent Computing, Springer, 2023, pp. 193–204.

The paper describes migrating MySQL data to MongoDB and Cassandra in three stages:

1. extract the data from MySQL;
2. preprocess it (transformations and standardization);
3. map the MySQL columns to NoSQL fields.

The full text is behind a paywall, and I couldn't find any code for it. So I was careful in the report: anything marked **(paper)** comes from what is publicly known about the paper, and everything else is general migration practice.

## So I built one

To really understand the process (and to have real answers for the performance and consistency questions), I wrote a small **DLoader-style pipeline**. It follows the same three stages plus a validation step. I used it to migrate a MySQL university database into MongoDB:

| From MySQL | To MongoDB |
|---|---|
| 8 departments, 60 instructors, 300 courses | 8 + 60 + 300 documents |
| 20,000 students + 88,152 enrollment rows | 20,000 student documents with the enrollments **embedded** |

The schema is copied from my previous checkpoint (`university-database`). The data is generated, with a few messy emails on purpose, so there is something to clean.

```bash
npm install
npm run migrate   # starts temporary MySQL + MongoDB, migrates, validates, benchmarks
npm run report    # rebuilds report/report.html from the results
```

You don't need to install MySQL or MongoDB, because the script starts temporary servers. The first run downloads MySQL, which takes a few minutes. While it runs, it needs a few hundred MB of free disk space.

## What the experiments showed

- **It works and it's verified.** The migration takes under a second, and all 10 validation checks pass: counts, checksums of ages, grades and credits, no enrollment pointing to a missing course, and 200 random students compared field by field.
- **The validation really catches problems.** I broke 3 students on purpose (removed an enrollment, changed an email, deleted a student), and 5 checks failed. Re-running the migration repaired everything without duplicates, because each document is upserted by its SQL id.
- **Batching matters a lot.** Sending 1 student per round trip did about 3,500 students per second. Batches of 1,000 did about 40,000, roughly 11× faster. (The exact numbers change a little each run.)
- **A surprise:** my first benchmark looked strange. Timing each stage showed that MySQL was using a bad query plan, because its statistics were stale after the bulk insert. It scanned every course instead of using the primary key. Running `ANALYZE TABLE` made that query about 3× faster, so the pipeline now does it first.
- **Some results were smaller than the textbook says.** Creating indexes after the load instead of before gave only a small, varying gain at 20,000 documents. I wrote that honestly instead of claiming a big win.
- **Storage:** 6.1 MB in MySQL. In MongoDB it was 10.2 MB uncompressed (field names and course titles repeated), but only 2.6 MB on disk thanks to compression.

## Files

```
SQL-to-NoSQL-Migration-DLoader.pdf   the answers to the checkpoint
dloader/pipeline.js                  extract → transform → load (the DLoader stages)
dloader/validate.js                  the 4 kinds of checks
dloader/run.js                       runs everything and saves dloader/results.json
dloader/source-schema.sql            the MySQL schema (from my SQL checkpoint)
report/build-report.js               turns the results into the report
```
