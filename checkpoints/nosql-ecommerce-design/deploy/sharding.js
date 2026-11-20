// PART 2 (sharding): run in mongosh connected to a mongos router of a sharded
// cluster, AFTER the refactor (npm run demo shows it) has created the version 2
// indexes:  mongosh "mongodb://mongos.internal:27017" deploy/sharding.js
//
// Cluster layout: 3 config servers (a replica set), at least 2 mongos routers,
// and N shards, where EACH shard is itself a 3-node replica set like
// deploy/replica-set.js. So sharding adds capacity and replication keeps it available.
//
// NOTE: I couldn't run a sharded cluster on my laptop, so unlike the rest of
// the project this script isn't covered by the tests. The things it depends on
// (the hashed index, no unique orderNumber index) are checked in test/refactored.test.js.

const shop = db.getSiblingDB('shop');
sh.enableSharding('shop');

// ORDERS: the only collection that grows without limit and takes thousands of
// writes per second, so the only one that is sharded.
// Shard key = hashed customer id:
//  - hashed: writes are spread evenly over all shards. A key like createdAt
//    or the ObjectId always increases, so every new order would go to the
//    same "last" shard (a hot shard).
//  - customer id: "my orders" contains the customer id, so it is sent to ONE
//    shard instead of all of them.
//  - Trade-off: queries without the customer id (back office "all paid
//    orders", or finding an order by number) ask every shard. They're rare
//    and use an index on each shard. Sales reports don't scan orders anymore
//    because they read the pre-aggregated collections.
sh.shardCollection('shop.orders', { 'customer.userId': 'hashed' });

// NOT sharded, on purpose:
//  - products: a few hundred thousand documents fit easily on one shard, and
//    they are read far more than written. Reads scale by adding replicas, and
//    a full-text search on a sharded collection would ask every shard.
//  - users: same size argument, and the unique index on email only works on
//    an unsharded collection (or one sharded by email).
//  - sales_daily_product / sales_daily_category: small by design (one
//    document per product or category per day).

// Optional, when the shop opens in several regions: keep EU customers' orders
// on EU shards (data protection, lower latency) with zones:
// sh.addShardToZone('shard-eu-1', 'EU');
// sh.updateZoneKeyRange('shop.orders', { ... }, { ... }, 'EU');
// (this needs a shard key that starts with a region field, e.g. { region: 1, 'customer.userId': 'hashed' })

printjson(sh.status());
printjson(shop.orders.getShardDistribution());
