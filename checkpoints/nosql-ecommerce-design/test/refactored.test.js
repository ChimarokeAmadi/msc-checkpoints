// Part 2: the refactor (migration, new validator, analytics, read routing).
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSchema } from '../src/initial/schema.js';
import { categoryTrend, refreshTrending, revenueByDay, runSalesRollup, topProducts, topProductsFromOrders } from '../src/refactored/analytics.js';
import { refactorToV2 } from '../src/refactored/refactor.js';
import { cancel, myOrders, placeOrderV2, searchCatalog, setOrderStatus, trendingProducts } from '../src/refactored/store.js';
import { plan, seed, startCluster } from './helpers.js';

let cluster, db, client, data, report;
const AS_OF = new Date('2026-10-31T12:00:00Z');
const FROM = new Date('2026-08-01T00:00:00Z');
const TO = new Date('2026-11-01T00:00:00Z');

before(async () => {
  cluster = await startCluster();
  ({ db, client } = cluster);
  await createInitialSchema(db);
  data = await seed(db, { products: 60, users: 40, orders: 3000 });
  report = await refactorToV2(db, { asOf: AS_OF });
});
after(() => cluster?.stop());

describe('migration to version 2', () => {
  test('every old order was migrated and got category and brand on its items', async () => {
    assert.equal(report.migrated, 3000);
    assert.equal(await db.collection('orders').countDocuments({ schemaVersion: { $ne: 2 } }), 0);
    const order = await db.collection('orders').findOne({});
    const product = data.products.find((p) => p._id.equals(order.items[0].productId));
    assert.equal(order.items[0].category, product.category.slug);
    assert.equal(order.items[0].brand, product.brand);
  });

  test('running the migration again changes nothing', async () => {
    const { migrateOrdersToV2 } = await import('../src/refactored/migrate.js');
    assert.equal(await migrateOrdersToV2(db), 0);
  });

  test('the validator is now strict: a version 1 order is refused', async () => {
    const v1 = await db.collection('orders').findOne({}, { projection: { _id: 0 } });
    delete v1.schemaVersion;
    v1.orderNumber = 'ORD-OLD-SHAPE';
    await assert.rejects(db.collection('orders').insertOne(v1), /Document failed validation/);
    const options = await db.listCollections({ name: 'orders' }).next();
    assert.equal(options.options.validationLevel, 'strict');
  });

  test('orders are ready for sharding: hashed shard-key index, orderNumber no longer unique', async () => {
    const indexes = await db.collection('orders').indexes();
    assert.ok(indexes.some((i) => i.key['customer.userId'] === 'hashed'));
    assert.ok(!indexes.some((i) => i.unique && i.key.orderNumber), 'a unique index on orderNumber cannot exist on a sharded collection');
    assert.ok(indexes.some((i) => i.name === 'orderNumber_lookup'));
  });
});

describe('orders on version 2', () => {
  test('new orders are written in the version 2 shape', async () => {
    const order = await placeOrderV2(client, db, { userId: data.users[0]._id, items: [{ sku: data.products[3].sku, quantity: 2 }] });
    assert.equal(order.schemaVersion, 2);
    assert.equal(order.items[0].category, data.products[3].category.slug);
    await setOrderStatus(db, order._id, 'paid');
    const mine = await myOrders(db, data.users[0]._id, { limit: 1 });
    assert.equal(mine[0].status, 'paid', 'read-your-own-write: order reads go to the primary');
  });
});

describe('analytics on pre-aggregated data', () => {
  test('the daily summaries give the same top products as scanning all the orders', async () => {
    const fast = await topProducts(db, { from: FROM, to: TO, limit: 10 });
    const slow = await topProductsFromOrders(db, { from: FROM, to: TO, limit: 10 });
    assert.equal(fast.length, 10);
    assert.deepEqual(
      fast.map((p) => [String(p._id), p.units, p.revenueCents]),
      slow.map((p) => [String(p._id), p.units, p.revenueCents]),
    );
  });

  test('the summaries are smaller than the order lines they replace, and read by index', async () => {
    const summaries = await db.collection('sales_daily_product').countDocuments();
    const lines = (await db.collection('orders').aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $unwind: '$items' }, { $count: 'n' }]).next()).n;
    assert.ok(summaries < lines, `${summaries} summaries vs ${lines} order lines`);
    const explain = await db.collection('sales_daily_product').find({ day: { $gte: FROM, $lt: TO } }).explain();
    assert.ok(plan(explain).includes('IXSCAN day_1'));
  });

  test('revenue per day adds up to the revenue of all non-cancelled orders', async () => {
    const days = await revenueByDay(db, { from: FROM, to: TO });
    const total = days.reduce((s, d) => s + d.revenueCents, 0);
    const expected = (
      await db
        .collection('orders')
        .aggregate([{ $match: { createdAt: { $gte: FROM, $lt: TO }, status: { $ne: 'cancelled' } } }, { $group: { _id: null, s: { $sum: '$totals.subtotalCents' } } }])
        .next()
    ).s;
    assert.equal(total, expected);
  });

  test('the category trend shows fitness growing (the seed data has that trend)', async () => {
    const trend = await categoryTrend(db, { from: FROM, to: TO, unit: 'month' });
    const fitness = trend.filter((t) => t._id.category === 'fitness');
    const first = fitness.find((t) => t._id.period.getUTCMonth() === 7); // August
    const last = fitness.find((t) => t._id.period.getUTCMonth() === 9); // October
    assert.ok(last.units > first.units * 2, `August ${first.units} units, October ${last.units} units`);
  });

  test('cancelling an order is reflected after the next incremental run, and only that day is recomputed', async () => {
    const order = await db.collection('orders').findOne({ status: 'paid', createdAt: { $lt: TO } });
    const day = new Date(Date.UTC(order.createdAt.getUTCFullYear(), order.createdAt.getUTCMonth(), order.createdAt.getUTCDate()));
    const line = order.items[0];
    const before = await db.collection('sales_daily_product').findOne({ _id: { day, productId: line.productId } });

    await cancel(client, db, order._id);
    const run = await runSalesRollup(db, { asOf: AS_OF });
    assert.ok(run.daysRecomputed <= 3, `recomputed ${run.daysRecomputed} days, not all 90`);

    const afterDoc = await db.collection('sales_daily_product').findOne({ _id: { day, productId: line.productId } });
    if (before.units === line.quantity) assert.equal(afterDoc, null, 'its only sale that day was cancelled, so the summary is gone');
    else assert.equal(afterDoc.units, before.units - line.quantity);

    // Idempotent: running again without changes gives the same numbers.
    const again = await runSalesRollup(db, { asOf: AS_OF });
    const same = await db.collection('sales_daily_product').findOne({ _id: { day, productId: line.productId } });
    assert.deepEqual(same?.units, afterDoc?.units);
    assert.ok(again.daysRecomputed <= 3);
  });

  test('"trending" uses the 30-day sales copied into each product', async () => {
    await refreshTrending(db, { asOf: AS_OF });
    const trending = await trendingProducts(db, { limit: 5 });
    assert.ok(trending.every((p, i) => i === 0 || trending[i - 1].sales30d.units >= p.sales30d.units));
    assert.ok(trending[0].sales30d.units > 0);
    const stages = plan(await db.collection('products').find({ status: 'active', categoryPath: 'sports' }).sort({ 'sales30d.units': -1 }).explain());
    assert.ok(stages.some((s) => s.includes('sales30d.units')), stages.join(' > '));
  });
});

describe('read routing', () => {
  test('catalog reads are answered by a secondary, order reads by the primary', async () => {
    const { CATALOG_READ, ORDER_READ } = await import('../src/refactored/connection.js');
    const catalogNode = await db.command({ hello: 1 }, CATALOG_READ);
    const orderNode = await db.command({ hello: 1 }, ORDER_READ);
    assert.equal(catalogNode.secondary, true);
    assert.equal(orderNode.isWritablePrimary, true);
    const results = await searchCatalog(db, { category: 'audio' });
    assert.ok(results.length > 0);
  });

  test('analytics reads go to the node tagged ANALYTICS', async () => {
    const admin = client.db('admin');
    const { config } = await admin.command({ replSetGetConfig: 1 });
    const status = await admin.command({ replSetGetStatus: 1 });
    const secondary = status.members.find((m) => m.stateStr === 'SECONDARY');
    const member = config.members.find((m) => m.host === secondary.name);
    member.tags = { nodeType: 'ANALYTICS' };
    member.priority = 0; // an analytics node must never become primary
    config.version += 1;
    await admin.command({ replSetReconfig: config });

    // Wait until the driver has seen the new tags, then ask which node answers.
    const { ANALYTICS_READ } = await import('../src/refactored/connection.js');
    let answeredBy;
    for (let i = 0; i < 40 && answeredBy !== secondary.name; i++) {
      await new Promise((r) => setTimeout(r, 250));
      answeredBy = (await db.command({ hello: 1 }, ANALYTICS_READ).catch(() => ({}))).me;
    }
    assert.equal(answeredBy, secondary.name);
    const top = await topProducts(db, { from: FROM, to: TO, limit: 3 });
    assert.equal(top.length, 3);
  });
});
