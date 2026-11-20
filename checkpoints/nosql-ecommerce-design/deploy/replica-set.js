// PART 2 (replication): the production replica set. Run once in mongosh,
// connected to the first node:  mongosh "mongodb://mongo-a.internal:27017" deploy/replica-set.js
//
// 3 "electable" nodes in 3 different availability zones (data centres): if
// one zone goes down, the other two are still a majority, so they elect a new
// primary and the shop keeps taking orders.
// 1 analytics node: it has a copy of all the data for the heavy reports, but
// priority 0 (it can never become primary) and votes 0 (it doesn't count in
// elections), so reports never affect the customers' nodes.
rs.initiate({
  _id: 'shop-rs',
  members: [
    { _id: 0, host: 'mongo-a.internal:27017', priority: 2, tags: { zone: 'az-a', nodeType: 'ELECTABLE' } },
    { _id: 1, host: 'mongo-b.internal:27017', priority: 1, tags: { zone: 'az-b', nodeType: 'ELECTABLE' } },
    { _id: 2, host: 'mongo-c.internal:27017', priority: 1, tags: { zone: 'az-c', nodeType: 'ELECTABLE' } },
    { _id: 3, host: 'mongo-analytics.internal:27017', priority: 0, votes: 0, tags: { zone: 'az-a', nodeType: 'ANALYTICS' } },
  ],
  settings: {
    // How long without a heartbeat from the primary before an election (default 10 s).
    electionTimeoutMillis: 10000,
  },
});

// The app connects with (see src/refactored/connection.js):
// mongodb://mongo-a.internal,mongo-b.internal,mongo-c.internal/shop?replicaSet=shop-rs&retryWrites=true&w=majority
