// PART 2: analytics with pre-aggregated data.
//
// Instead of scanning every order for every report, a job summarises the
// orders into two small collections:
//   sales_daily_product   one document per product per day
//   sales_daily_category  one document per category per day
// 90 days x 200 products is at most 18,000 small documents, whatever the
// number of orders, so reports stay fast as the shop grows.
//
// The job is INCREMENTAL and IDEMPOTENT: it only recomputes the days that had
// an order created or changed (e.g. cancelled) since the last run, and running
// it twice gives the same result.
import { ANALYTICS_READ } from './connection.js';

const DAY = 86400000;
const startOfDay = (d) => new Date(Math.floor(d.getTime() / DAY) * DAY);

function dayMatch(day) {
  return { $match: { createdAt: { $gte: day, $lt: new Date(day.getTime() + DAY) }, status: { $ne: 'cancelled' } } };
}

async function rollupDay(db, day, computedAt) {
  const orders = db.collection('orders');
  await orders
    .aggregate([
      dayMatch(day),
      { $unwind: '$items' },
      {
        $group: {
          _id: { day: { $literal: day }, productId: '$items.productId' },
          sku: { $first: '$items.sku' },
          name: { $first: '$items.name' },
          category: { $first: '$items.category' },
          brand: { $first: '$items.brand' },
          units: { $sum: '$items.quantity' },
          revenueCents: { $sum: '$items.lineTotalCents' },
          orders: { $sum: 1 },
        },
      },
      { $set: { day: '$_id.day', productId: '$_id.productId', computedAt: { $literal: computedAt } } },
      { $merge: { into: 'sales_daily_product', on: '_id', whenMatched: 'replace', whenNotMatched: 'insert' } },
    ])
    .toArray();

  await orders
    .aggregate([
      dayMatch(day),
      { $unwind: '$items' },
      // First per order and category, so "orders" counts each order once.
      { $group: { _id: { category: '$items.category', order: '$_id' }, units: { $sum: '$items.quantity' }, revenueCents: { $sum: '$items.lineTotalCents' } } },
      {
        $group: {
          _id: { day: { $literal: day }, category: '$_id.category' },
          units: { $sum: '$units' },
          revenueCents: { $sum: '$revenueCents' },
          orders: { $sum: 1 },
        },
      },
      { $set: { day: '$_id.day', category: '$_id.category', computedAt: { $literal: computedAt } } },
      { $merge: { into: 'sales_daily_category', on: '_id', whenMatched: 'replace', whenNotMatched: 'insert' } },
    ])
    .toArray();

  // A product whose orders that day were all cancelled wasn't rewritten by
  // this run, so its old summary is removed.
  for (const name of ['sales_daily_product', 'sales_daily_category']) {
    await db.collection(name).deleteMany({ day, computedAt: { $ne: computedAt } });
  }
}

// Recomputes every day that had an order created or updated since `since`.
export async function rollupSales(db, { since = new Date(0), computedAt = new Date() } = {}) {
  const days = await db
    .collection('orders')
    .aggregate([{ $match: { updatedAt: { $gte: since } } }, { $group: { _id: { $dateTrunc: { date: '$createdAt', unit: 'day' } } } }, { $sort: { _id: 1 } }])
    .toArray();
  for (const { _id: day } of days) await rollupDay(db, day, computedAt);
  return days.map((d) => d._id);
}

// Copies each product's sales over the last 30 days into the product itself,
// so the catalog can sort by "trending" without touching the analytics data.
export async function refreshTrending(db, { asOf = new Date(), computedAt = new Date() } = {}) {
  const to = startOfDay(new Date(asOf.getTime() + DAY));
  const from = new Date(to.getTime() - 30 * DAY);
  await db
    .collection('sales_daily_product')
    .aggregate([
      { $match: { day: { $gte: from, $lt: to } } },
      { $group: { _id: '$productId', units: { $sum: '$units' }, revenueCents: { $sum: '$revenueCents' } } },
      { $project: { sales30d: { units: '$units', revenueCents: '$revenueCents', computedAt: { $literal: computedAt } } } },
      { $merge: { into: 'products', on: '_id', whenMatched: 'merge', whenNotMatched: 'discard' } },
    ])
    .toArray();
  // Products with no sales in the window go back to zero.
  await db
    .collection('products')
    .updateMany({ 'sales30d.computedAt': { $ne: computedAt } }, { $set: { sales30d: { units: 0, revenueCents: 0, computedAt } } });
}

// The scheduled job (e.g. every 5 minutes). It remembers when it last ran in
// the `jobs` collection. It starts one minute before the last run to be safe
// with orders written while the last run was going.
export async function runSalesRollup(db, { asOf = new Date() } = {}) {
  const jobs = db.collection('jobs');
  const job = await jobs.findOne({ _id: 'sales-rollup' });
  const since = job ? new Date(job.lastStartedAt.getTime() - 60000) : new Date(0);
  const startedAt = new Date();
  const days = await rollupSales(db, { since, computedAt: startedAt });
  await refreshTrending(db, { asOf, computedAt: startedAt });
  await jobs.updateOne({ _id: 'sales-rollup' }, { $set: { lastStartedAt: startedAt, lastDaysRecomputed: days.length } }, { upsert: true });
  return { since, daysRecomputed: days.length };
}

// ---------- Reports (read the pre-aggregated collections) ----------

export function topProducts(db, { from, to, category, limit = 10 }, options = ANALYTICS_READ) {
  return db
    .collection('sales_daily_product')
    .aggregate(
      [
        { $match: { day: { $gte: from, $lt: to }, ...(category && { category }) } },
        {
          $group: {
            _id: '$productId',
            sku: { $first: '$sku' },
            name: { $first: '$name' },
            category: { $first: '$category' },
            units: { $sum: '$units' },
            revenueCents: { $sum: '$revenueCents' },
          },
        },
        { $sort: { revenueCents: -1, _id: 1 } },
        { $limit: limit },
      ],
      options,
    )
    .toArray();
}

// Revenue and units per category per week (or month): the "product trends" report.
export function categoryTrend(db, { from, to, unit = 'week' }, options = ANALYTICS_READ) {
  return db
    .collection('sales_daily_category')
    .aggregate(
      [
        { $match: { day: { $gte: from, $lt: to } } },
        {
          $group: {
            _id: { period: { $dateTrunc: { date: '$day', unit, startOfWeek: 'monday' } }, category: '$category' },
            units: { $sum: '$units' },
            revenueCents: { $sum: '$revenueCents' },
            orders: { $sum: '$orders' },
          },
        },
        { $sort: { '_id.period': 1, '_id.category': 1 } },
      ],
      options,
    )
    .toArray();
}

export function revenueByDay(db, { from, to }, options = ANALYTICS_READ) {
  return db
    .collection('sales_daily_category')
    .aggregate(
      [{ $match: { day: { $gte: from, $lt: to } } }, { $group: { _id: '$day', revenueCents: { $sum: '$revenueCents' }, units: { $sum: '$units' } } }, { $sort: { _id: 1 } }],
      options,
    )
    .toArray();
}

// The same "top products" report computed directly from the orders, without
// the pre-aggregation. Used by the tests (both must agree) and by the demo to
// compare how much work each one does.
export function topProductsFromOrders(db, { from, to, limit = 10 }, options = ANALYTICS_READ) {
  return db
    .collection('orders')
    .aggregate(
      [
        { $match: { createdAt: { $gte: from, $lt: to }, status: { $ne: 'cancelled' } } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.productId',
            sku: { $first: '$items.sku' },
            name: { $first: '$items.name' },
            category: { $first: '$items.category' },
            units: { $sum: '$items.quantity' },
            revenueCents: { $sum: '$items.lineTotalCents' },
          },
        },
        { $sort: { revenueCents: -1, _id: 1 } },
        { $limit: limit },
      ],
      options,
    )
    .toArray();
}
