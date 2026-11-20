// Runs the whole project on a bigger data set and prints what happens:
// Part 1 schema + queries + order throughput, then the Part 2 refactor and the
// analytics. Run with: npm run demo   (output saved in docs/demo-output.txt)
import { createInitialSchema } from '../src/initial/schema.js';
import { placeOrder, searchProducts } from '../src/initial/store.js';
import { categoryTrend, topProducts, topProductsFromOrders } from '../src/refactored/analytics.js';
import { refactorToV2 } from '../src/refactored/refactor.js';
import { placeOrderV2, trendingProducts } from '../src/refactored/store.js';
import { makeHistoricalOrders, makeProducts, makeUsers } from '../data/seed.js';
import { plan, startCluster } from '../test/helpers.js';

const money = (c) => `$${(c / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const title = (t) => console.log(`\n=== ${t} ===`);
const AS_OF = new Date('2026-10-31T12:00:00Z');

async function throughput(label, fn, { total = 3000, concurrency = 64 }) {
  let next = 0;
  let failed = 0;
  const start = performance.now();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (next < total) {
        const i = next++;
        await fn(i).catch(() => failed++);
      }
    }),
  );
  const seconds = (performance.now() - start) / 1000;
  console.log(`${label}: ${total} orders in ${seconds.toFixed(1)} s = ${Math.round(total / seconds)} orders/second (${concurrency} at a time, ${failed} failed)`);
}

const cluster = await startCluster();
const { db, client } = cluster;
try {
  title('PART 1: initial schema');
  await createInitialSchema(db);
  const products = makeProducts(200);
  const users = makeUsers(1000);
  const orders = makeHistoricalOrders(products, users, { count: 100000, days: 90 });
  await db.collection('products').insertMany(products, { writeConcern: { w: 3 } });
  await db.collection('users').insertMany(users, { writeConcern: { w: 3 } });
  await db.collection('orders').insertMany(orders, { writeConcern: { w: 3 } });
  console.log(`Loaded ${products.length} products, ${users.length} users, ${orders.length} orders (90 days, version 1 shape)`);

  const search = await searchProducts(db, { text: 'noise cancelling headphones', sort: 'relevance', limit: 3 });
  console.log('\nSearch "noise cancelling headphones":');
  for (const p of search) console.log(`  ${p.name.padEnd(48)} ${money(p.priceCents)}  score ${p.score.toFixed(2)}`);
  const explainText = await db.collection('products').find({ status: 'active', $text: { $search: 'noise cancelling headphones' } }).explain('executionStats');
  console.log(`  plan: ${plan(explainText).join(' > ')}`);

  const browse = await db.collection('products').find({ status: 'active', categoryPath: 'audio' }).sort({ priceCents: 1 }).limit(20).explain('executionStats');
  console.log(`\nBrowse "audio" by price: ${plan(browse).join(' > ')}, ${browse.executionStats.totalDocsExamined} documents read for 20 results`);
  const mine = await db.collection('orders').find({ 'customer.userId': users[0]._id }).sort({ createdAt: -1 }).limit(10).explain('executionStats');
  console.log(`"My orders": ${plan(mine).join(' > ')}, ${mine.executionStats.totalDocsExamined} documents read out of ${orders.length}`);

  console.log('\nOrder throughput (each order = 1 transaction: stock check + stock update + insert, w: majority):');
  await throughput('  Part 1', (i) => placeOrder(client, db, { userId: users[i % users.length]._id, items: [{ sku: products[i % products.length].sku, quantity: 1 }] }), {});

  title('PART 2: refactor');
  const t0 = performance.now();
  const report = await refactorToV2(db, { asOf: AS_OF });
  console.log(`Migrated ${report.migrated} orders to version 2, recomputed ${report.daysRecomputed} days of sales summaries in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
  for (const name of ['orders', 'sales_daily_product', 'sales_daily_category']) {
    console.log(`  ${name.padEnd(22)} ${String(await db.collection(name).countDocuments()).padStart(6)} documents`);
  }

  const from = new Date('2026-10-01T00:00:00Z');
  const to = new Date('2026-11-01T00:00:00Z');
  console.log('\nTop 5 products in October (from the daily summaries):');
  for (const p of await topProducts(db, { from, to, limit: 5 })) console.log(`  ${p.name.padEnd(48)} ${String(p.units).padStart(4)} sold  ${money(p.revenueCents)}`);

  const fast = await db.collection('sales_daily_product').aggregate([{ $match: { day: { $gte: from, $lt: to } } }, { $group: { _id: '$productId', r: { $sum: '$revenueCents' } } }]).explain('executionStats');
  const slow = await db
    .collection('orders')
    .aggregate([{ $match: { createdAt: { $gte: from, $lt: to }, status: { $ne: 'cancelled' } } }, { $unwind: '$items' }, { $group: { _id: '$items.productId', r: { $sum: '$items.lineTotalCents' } } }])
    .explain('executionStats');
  // Documents read by the winning plan (the first stage of the pipeline).
  const docs = (e) => e.stages?.[0]?.$cursor?.executionStats?.totalDocsExamined ?? e.executionStats?.totalDocsExamined;
  console.log(`\n"Sales per product in October": documents MongoDB has to read`);
  console.log(`  from the raw orders:      ${String(docs(slow)).padStart(6)} orders`);
  console.log(`  from the daily summaries: ${String(docs(fast)).padStart(6)} product-day summaries`);
  const check = await topProductsFromOrders(db, { from, to, limit: 5 });
  console.log(`  same answer: ${JSON.stringify(check.map((p) => p.revenueCents)) === JSON.stringify((await topProducts(db, { from, to, limit: 5 })).map((p) => p.revenueCents))}`);

  const aug = new Date('2026-08-01T00:00:00Z');
  const trendFast = await db.collection('sales_daily_category').aggregate([{ $match: { day: { $gte: aug, $lt: to } } }, { $group: { _id: '$category', u: { $sum: '$units' } } }]).explain('executionStats');
  const trendSlow = await db
    .collection('orders')
    .aggregate([{ $match: { createdAt: { $gte: aug, $lt: to }, status: { $ne: 'cancelled' } } }, { $unwind: '$items' }, { $group: { _id: '$items.category', u: { $sum: '$items.quantity' } } }])
    .explain('executionStats');
  console.log(`\n"Units per category, Aug to Oct": documents MongoDB has to read`);
  console.log(`  from the raw orders:      ${String(docs(trendSlow)).padStart(6)} orders`);
  console.log(`  from the daily summaries: ${String(docs(trendFast)).padStart(6)} category-day summaries`);

  console.log('\nMonthly trend per category (units sold):');
  const trend = await categoryTrend(db, { from: aug, to, unit: 'month' });
  const months = [...new Set(trend.map((t) => t._id.period.toISOString().slice(0, 7)))];
  console.log(`  ${'category'.padEnd(12)} ${months.map((m) => m.padStart(8)).join('')}`);
  for (const cat of [...new Set(trend.map((t) => t._id.category))]) {
    const row = months.map((m) => trend.find((t) => t._id.category === cat && t._id.period.toISOString().startsWith(m))?.units ?? 0);
    console.log(`  ${cat.padEnd(12)} ${row.map((u) => String(u).padStart(8)).join('')}`);
  }

  console.log('\nTrending products (last 30 days, stored in each product):');
  for (const p of await trendingProducts(db, { limit: 5 })) console.log(`  ${p.name.padEnd(48)} ${p.sales30d.units} sold`);

  console.log('\nOrder throughput after the refactor:');
  await throughput('  Part 2', (i) => placeOrderV2(client, db, { userId: users[i % users.length]._id, items: [{ sku: products[(i * 7) % products.length].sku, quantity: 1 }] }), {});
  console.log('\n(One laptop running all 3 replica set members. A real cluster adds shards to add write capacity.)');
} finally {
  await cluster.stop();
}
