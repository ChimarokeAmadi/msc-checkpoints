// Part 2: high availability. We stop the primary node in the middle of the
// test and check what keeps working.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSchema } from '../src/initial/schema.js';
import { refactorToV2 } from '../src/refactored/refactor.js';
import { myOrders, placeOrderV2, searchCatalog } from '../src/refactored/store.js';
import { seed, startCluster } from './helpers.js';

let cluster, db, client, data;

before(async () => {
  // Shorter election timeout than the default 10 s, so the test is quick.
  cluster = await startCluster({ configSettings: { electionTimeoutMillis: 2000, heartbeatIntervalMillis: 500 } });
  ({ db, client } = cluster);
  await createInitialSchema(db);
  data = await seed(db, { products: 30, users: 10, orders: 200 });
  await refactorToV2(db, { asOf: new Date('2026-10-31T12:00:00Z') });
});
after(() => cluster?.stop());

test('when the primary dies: browsing keeps working, orders continue after the election, nothing confirmed is lost', async () => {
  const user = data.users[0]._id;
  const sku = data.products[0].sku;
  const confirmed = await placeOrderV2(client, db, { userId: user, items: [{ sku, quantity: 1 }] });

  const status = await client.db('admin').command({ replSetGetStatus: 1 });
  const primaryName = status.members.find((m) => m.stateStr === 'PRIMARY').name;
  const primary = cluster.replSet.servers.find((s) => s.getUri().includes(primaryName.split(':')[1]));
  // SIGKILL = a real crash. (A clean shutdown would hand over to a secondary
  // instantly, which is too easy.)
  primary.instanceInfo.instance.mongodProcess.kill('SIGKILL');
  const killedAt = Date.now();

  // 1. Catalog reads go to secondaries, so they work right away.
  const products = await searchCatalog(db, { category: 'audio' });
  assert.ok(products.length > 0);
  const browseMs = Date.now() - killedAt;

  // 2. Placing an order waits for the new primary (the driver retries).
  const order = await placeOrderV2(client, db, { userId: user, items: [{ sku, quantity: 1 }] });
  const orderMs = Date.now() - killedAt;
  assert.equal(order.status, 'pending');

  // 3. The order confirmed BEFORE the crash is still there (it was written
  //    with w: majority, so the new primary already had it).
  const mine = await myOrders(db, user, { limit: 5 });
  assert.ok(mine.some((o) => o._id.equals(confirmed._id)));
  assert.ok(mine.some((o) => o._id.equals(order._id)));

  const newPrimary = (await client.db('admin').command({ replSetGetStatus: 1 })).members.find((m) => m.stateStr === 'PRIMARY').name;
  assert.notEqual(newPrimary, primaryName);
  console.log(`browse answered ${browseMs} ms after the crash, first order after failover ${orderMs} ms`);
});
