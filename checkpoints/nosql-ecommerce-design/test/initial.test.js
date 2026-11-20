// Part 1: the initial schema and its queries.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSchema } from '../src/initial/schema.js';
import {
  cancelOrder,
  getProductBySlug,
  ordersByStatus,
  ordersForCustomer,
  placeOrder,
  productsWithAttribute,
  searchProducts,
  updateOrderStatus,
} from '../src/initial/store.js';
import { plan, seed, startCluster } from './helpers.js';

let cluster, db, client, data;

before(async () => {
  cluster = await startCluster();
  ({ db, client } = cluster);
  await createInitialSchema(db);
  data = await seed(db, { products: 60, users: 30 });
});
after(() => cluster?.stop());

const stockOf = async (sku) => (await db.collection('products').findOne({ sku })).stock;
const someUser = () => data.users[0]._id;

describe('validation', () => {
  test('refuses a product with a negative price or a bad sku', async () => {
    const good = { ...data.products[0], _id: undefined, sku: 'TST-00001', slug: 'test-1' };
    delete good._id;
    await assert.rejects(db.collection('products').insertOne({ ...good, priceCents: -5 }), /Document failed validation/);
    await assert.rejects(db.collection('products').insertOne({ ...good, sku: 'bad sku' }), /Document failed validation/);
    await db.collection('products').insertOne(good);
    await db.collection('products').deleteOne({ sku: 'TST-00001' });
  });

  test('refuses an order with no items or an unknown status', async () => {
    const order = {
      orderNumber: 'X1',
      customer: { userId: someUser(), name: 'A', email: 'a@b.c', shippingAddress: { line1: '1 St', city: 'Lagos', country: 'NG', postalCode: '1' } },
      items: [],
      totals: { subtotalCents: 0, shippingCents: 0, totalCents: 0 },
      status: 'pending',
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await assert.rejects(db.collection('orders').insertOne(order), /Document failed validation/);
    await assert.rejects(db.collection('orders').insertOne({ ...order, status: 'lost' }), /Document failed validation/);
  });

  test('the same email cannot register twice', async () => {
    await assert.rejects(db.collection('users').insertOne({ ...data.users[1], _id: undefined }), /duplicate key/);
  });
});

describe('catalog', () => {
  test('full-text search finds products by name with the text index', async () => {
    const found = await searchProducts(db, { text: 'dumbbells', sort: 'relevance' });
    assert.ok(found.length > 0);
    assert.ok(found.every((p) => /dumbbells/i.test(p.name)));
    const explain = await db.collection('products').find({ status: 'active', $text: { $search: 'dumbbells' } }).explain();
    assert.ok(plan(explain).some((s) => s.startsWith('TEXT') || s.includes('product_search')), plan(explain).join(' > '));
  });

  test('browsing a category is sorted by price and uses the category index (no in-memory sort)', async () => {
    const list = await searchProducts(db, { category: 'audio', limit: 50 });
    assert.ok(list.length > 0);
    assert.ok(list.every((p, i) => i === 0 || list[i - 1].priceCents <= p.priceCents));
    const top = await searchProducts(db, { category: 'electronics', limit: 100 });
    assert.ok(top.some((p) => p.category.slug === 'laptops') && top.some((p) => p.category.slug === 'headphones'), 'a parent category includes its children');
    const explain = await db.collection('products').find({ status: 'active', categoryPath: 'audio' }).sort({ priceCents: 1 }).explain();
    const stages = plan(explain);
    assert.ok(stages.includes('IXSCAN status_1_categoryPath_1_priceCents_1'), stages.join(' > '));
    assert.ok(!stages.includes('SORT'), 'sorted by the index, not in memory');
  });

  test('price range, product page and attribute filter', async () => {
    const cheap = await searchProducts(db, { minPrice: 1000, maxPrice: 3000, limit: 100 });
    assert.ok(cheap.every((p) => p.priceCents >= 1000 && p.priceCents <= 3000));
    const page = await getProductBySlug(db, data.products[5].slug);
    assert.equal(page.sku, data.products[5].sku);
    const black = await productsWithAttribute(db, 'color', 'black');
    assert.ok(black.length > 0 && black.every((p) => p.attrs.some((a) => a.k === 'color' && a.v === 'black')));
  });
});

describe('orders', () => {
  test('placing an order decrements stock and stores a snapshot of the customer and prices', async () => {
    const [a, b] = data.products;
    const before = [await stockOf(a.sku), await stockOf(b.sku)];
    const order = await placeOrder(client, db, { userId: someUser(), items: [{ sku: a.sku, quantity: 2 }, { sku: b.sku, quantity: 1 }, { sku: a.sku, quantity: 1 }] });
    assert.equal(order.items.length, 2, 'the same sku twice is merged into one line');
    assert.equal(order.items[0].quantity, 3);
    assert.equal(order.items[0].unitPriceCents, a.priceCents);
    assert.equal(order.customer.email, data.users[0].email);
    assert.match(order.orderNumber, /^ORD-\d{8}-[0-9A-F]{24}$/);
    assert.deepEqual([await stockOf(a.sku), await stockOf(b.sku)], [before[0] - 3, before[1] - 1]);
    const subtotal = a.priceCents * 3 + b.priceCents;
    assert.equal(order.totals.totalCents, subtotal + (subtotal >= 5000 ? 0 : 500));
  });

  test('if one item is out of stock, nothing is written (transaction rollback)', async () => {
    const [a, , c] = data.products;
    await db.collection('products').updateOne({ sku: c.sku }, { $set: { stock: 1 } });
    const before = await stockOf(a.sku);
    const count = await db.collection('orders').countDocuments();
    await assert.rejects(placeOrder(client, db, { userId: someUser(), items: [{ sku: a.sku, quantity: 1 }, { sku: c.sku, quantity: 2 }] }), { code: 'OUT_OF_STOCK' });
    assert.equal(await stockOf(a.sku), before, 'the first item was given back');
    assert.equal(await db.collection('orders').countDocuments(), count);
  });

  test('20 customers racing for the last 3 items: exactly 3 orders succeed', async () => {
    const p = data.products[10];
    await db.collection('products').updateOne({ sku: p.sku }, { $set: { stock: 3 } });
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, (_, i) => placeOrder(client, db, { userId: data.users[i % data.users.length]._id, items: [{ sku: p.sku, quantity: 1 }] })),
    );
    assert.equal(results.filter((r) => r.status === 'fulfilled').length, 3);
    assert.equal(await stockOf(p.sku), 0);
  });

  test('the delivery status only moves forward', async () => {
    const order = await placeOrder(client, db, { userId: someUser(), items: [{ sku: data.products[20].sku, quantity: 1 }] });
    await assert.rejects(updateOrderStatus(db, order._id, 'shipped'), { code: 'BAD_TRANSITION' }, 'cannot ship before payment');
    await updateOrderStatus(db, order._id, 'paid');
    // Two workers try to ship it at the same time: only one wins.
    const both = await Promise.allSettled([updateOrderStatus(db, order._id, 'shipped'), updateOrderStatus(db, order._id, 'shipped')]);
    assert.equal(both.filter((r) => r.status === 'fulfilled').length, 1);
    const done = await updateOrderStatus(db, order._id, 'delivered');
    assert.deepEqual(done.statusHistory.map((h) => h.status), ['pending', 'paid', 'shipped', 'delivered']);
    await assert.rejects(cancelOrder(client, db, order._id), { code: 'BAD_TRANSITION' }, 'a delivered order cannot be cancelled');
  });

  test('cancelling gives the stock back', async () => {
    const p = data.products[30];
    const before = await stockOf(p.sku);
    const order = await placeOrder(client, db, { userId: someUser(), items: [{ sku: p.sku, quantity: 4 }] });
    assert.equal(await stockOf(p.sku), before - 4);
    const cancelled = await cancelOrder(client, db, order._id);
    assert.equal(cancelled.status, 'cancelled');
    assert.equal(await stockOf(p.sku), before);
  });

  test('"my orders" is newest first and uses the customer index', async () => {
    const mine = await ordersForCustomer(db, someUser());
    assert.ok(mine.length >= 3);
    assert.ok(mine.every((o, i) => i === 0 || mine[i - 1].createdAt >= o.createdAt));
    const stages = plan(await db.collection('orders').find({ 'customer.userId': someUser() }).sort({ createdAt: -1 }).explain());
    assert.ok(stages.includes('IXSCAN customer.userId_1_createdAt_-1'), stages.join(' > '));
    const paid = await ordersByStatus(db, 'cancelled');
    assert.ok(paid.every((o) => o.status === 'cancelled'));
  });
});
