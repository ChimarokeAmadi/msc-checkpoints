# Designing a NoSQL database from multiple requirement views

For this checkpoint I designed the database of an e-commerce application in **MongoDB** (a document database). Then I refactored it when new requirements arrived: large-scale analytics, and high availability with partition tolerance.

I didn't want the schema to exist only on paper, so everything is real code: the collections, validators and indexes, the queries, the migration from version 1 to version 2, the analytics job, and the cluster configuration. **26 tests** run it on a real 3-node MongoDB replica set, including one that crashes the primary in the middle of the test.

## The deliverables

| Deliverable | Where |
|---|---|
| **Initial schema design** (Part 1) | [docs/1-initial-schema.md](docs/1-initial-schema.md), code in [src/initial/](src/initial/) |
| **Refactored schema** (Part 2) | [docs/2-refactored-schema.md](docs/2-refactored-schema.md), code in [src/refactored/](src/refactored/) and [deploy/](deploy/) |
| **Reflection** | [below](#reflection) |
| Proof it works | [test/](test/) (26 tests) and [docs/demo-output.txt](docs/demo-output.txt) (100,000 orders) |

## The design in short

**Part 1.** Three collections:
- **products:** a flexible document per product, with an attribute pattern for the attributes that differ between product types, a weighted text index for search, and a `{status, categoryPath, priceCents}` index for browsing.
- **users:** with their addresses embedded.
- **orders:** one self-contained document per order, with the items and a snapshot of the customer and prices embedded.

Placing an order is one transaction with conditional stock updates, so the last item can never be sold twice. Changing the delivery status is one atomic update that only allows forward moves. It handled about **3,000 orders per second** on my laptop.

**Part 2:**
- **Denormalization.** Order items now carry their category and brand, and a job pre-aggregates sales per product per day and per category per day. Reports read **9 to 100 times fewer documents** and give exactly the same answers.
- **Sharding.** Only `orders` is sharded, on a **hashed customer id**: writes are spread evenly and "my orders" goes to a single shard. Products and users stay unsharded on purpose.
- **Replication.** Each shard is a 3-zone replica set plus an analytics-only node. The catalog is read from secondaries and favours availability, while orders use majority writes and favour consistency. When I killed the primary, browsing kept working and orders resumed about 2 seconds later, with no confirmed order lost.

## Running it

You need Node.js 20.19 or newer. You don't need to install MongoDB: the tests start a temporary MongoDB replica set in memory (the first run downloads MongoDB, about 100 MB).

```bash
npm install
npm test          # 26 tests: Part 1, Part 2 and the failover test
npm run demo      # the whole story on 100,000 orders (output in docs/demo-output.txt)
```

The two files in `deploy/` are for a real cluster and are run with `mongosh` (see the comments inside). I couldn't run a sharded cluster on my laptop, so `deploy/sharding.js` is the one part that isn't tested. The things it depends on (the hashed shard-key index, and no unique `orderNumber` index) are tested.

```
src/initial/       Part 1: schema.js (validators + indexes), store.js (queries)
src/refactored/    Part 2: schema.js, migrate.js, analytics.js, connection.js, store.js, refactor.js
deploy/            replica-set.js and sharding.js (mongosh scripts for production)
data/seed.js       generates products, users and 90 days of orders
scripts/demo.js    runs everything on a big data set
test/              initial, refactored and availability tests
docs/              the two design documents and the demo output
```

## Reflection

**What challenges did I face during the refactor?** The hardest part was changing a schema that already holds data. Old orders had no category, so I wrote a batch migration that can safely run twice, and switched the validator to "moderate" during the migration so old and new orders could coexist. Sharding brought surprises too: MongoDB can't enforce a unique `orderNumber` across shards, so I built the number from the ObjectId instead. Choosing the shard key took thought, because `createdAt` looked natural but would send every new order to the same shard.

**How did the new requirements affect my decisions?** Analytics pushed me to copy category and brand into orders and to pre-aggregate sales per day. I update the summaries in a separate job, not inside the order transaction, so thousands of orders per second don't all update the same document. High availability made me decide consistency per type of data: the catalog can be read from any node and be a few seconds old, but orders stay strongly consistent, because I'd rather wait two seconds than sell the last item twice.

**How did the refactor improve the system?** Writes can now scale by adding shards, and "my orders" still hits only one. Reports read 9 to 100 times fewer documents on their own node, so they never slow down customers. In my failover test, the catalog kept answering when the primary crashed, and orders resumed after about two seconds without losing any confirmed order.
