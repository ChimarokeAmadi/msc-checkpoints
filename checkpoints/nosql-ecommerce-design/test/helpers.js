import { MongoClient } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { CLIENT_OPTIONS } from '../src/refactored/connection.js';
import { makeHistoricalOrders, makeProducts, makeUsers } from '../data/seed.js';

// A real 3-node replica set in memory (transactions need a replica set).
export async function startCluster({ count = 3, configSettings } = {}) {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count, storageEngine: 'wiredTiger', ...(configSettings && { configSettings }) } });
  await replSet.waitUntilRunning();
  const client = new MongoClient(replSet.getUri(), CLIENT_OPTIONS);
  await client.connect();
  return {
    replSet,
    client,
    db: client.db('shop'),
    async stop() {
      await client.close();
      await replSet.stop();
    },
  };
}

// Inserts with w: <all nodes> so reads from secondaries see the data at once.
export async function seed(db, { products = 60, users = 30, orders = 0, nodes = 3 } = {}) {
  const p = makeProducts(products);
  const u = makeUsers(users);
  const w = { writeConcern: { w: nodes } };
  await db.collection('products').insertMany(p, w);
  await db.collection('users').insertMany(u, w);
  let o = [];
  if (orders) {
    o = makeHistoricalOrders(p, u, { count: orders });
    await db.collection('orders').insertMany(o, w);
  }
  return { products: p, users: u, orders: o };
}

// Which index a query used, from explain(): e.g. "IXSCAN status_1_categoryPath_1_priceCents_1".
export function plan(explain) {
  const stages = [];
  const walk = (s) => {
    if (!s) return;
    stages.push(s.indexName ? `${s.stage} ${s.indexName}` : s.stage);
    walk(s.inputStage);
    (s.inputStages || []).forEach(walk);
  };
  walk(explain.queryPlanner?.winningPlan?.queryPlan || explain.queryPlanner?.winningPlan);
  return stages;
}
