// test/api.test.js
// Tests the whole API against a temporary in-memory MongoDB.
// Run with: npm test

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

process.env.JWT_SECRET = 'test-secret';
process.env.ADMIN_EMAIL = 'boss@kora.test';
const { app } = require('../server');
const { seedIfEmpty } = require('../seed');
const Product = require('../models/Product');

let mongod, server, base;

// Small helper: call the API and get { status, body }
async function api(method, url, { body, token } = {}) {
  const res = await fetch(base + url, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

const shipping = { fullName: 'Ada Customer', address: '12 Market Road', city: 'Lagos', phone: '0800 000 0000' };
let admin, alice, bob, mug, shirt;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri('ecommerce_test'));
  await seedIfEmpty();
  await Product.syncIndexes();
  server = app.listen(0);
  base = `http://localhost:${server.address().port}`;
  admin = (await api('POST', '/api/auth/register', { body: { name: 'Boss', email: 'Boss@kora.test', password: 'password123' } })).body;
  alice = (await api('POST', '/api/auth/register', { body: { name: 'Alice', email: 'alice@kora.test', password: 'password123' } })).body;
  bob = (await api('POST', '/api/auth/register', { body: { name: 'Bob', email: 'bob@kora.test', password: 'password123' } })).body;
  mug = (await api('GET', '/api/products/ceramic-coffee-mug')).body;
  shirt = (await api('GET', '/api/products/cotton-t-shirt')).body;
});

after(async () => {
  server.close();
  await mongoose.disconnect();
  await mongod.stop();
});

test('the starter products are added once, and only into an empty shop', async () => {
  assert.strictEqual(await seedIfEmpty(), 0);
  const { body } = await api('GET', '/api/products?limit=50');
  assert.strictEqual(body.total, 12);
  assert.strictEqual(mug.image, '/products/ceramic-coffee-mug.svg');
});

test('register: hides the password, gives admin only to ADMIN_EMAIL, refuses duplicates', async () => {
  assert.ok(admin.token);
  assert.strictEqual(admin.user.isAdmin, true);
  assert.strictEqual(alice.user.isAdmin, false);
  assert.strictEqual(alice.user.passwordHash, undefined);
  const dup = await api('POST', '/api/auth/register', { body: { name: 'A2', email: 'ALICE@kora.test', password: 'password123' } });
  assert.strictEqual(dup.status, 409);
  const short = await api('POST', '/api/auth/register', { body: { name: 'C', email: 'c@kora.test', password: '123' } });
  assert.strictEqual(short.status, 400);
  const badEmail = await api('POST', '/api/auth/register', { body: { name: 'C', email: 'not-an-email', password: 'password123' } });
  assert.strictEqual(badEmail.status, 400);
});

test('login and /me', async () => {
  const ok = await api('POST', '/api/auth/login', { body: { email: 'alice@kora.test', password: 'password123' } });
  assert.strictEqual(ok.status, 200);
  const me = await api('GET', '/api/auth/me', { token: ok.body.token });
  assert.strictEqual(me.body.user.email, 'alice@kora.test');
  const wrong = await api('POST', '/api/auth/login', { body: { email: 'alice@kora.test', password: 'nope-nope' } });
  assert.strictEqual(wrong.status, 401);
  assert.strictEqual((await api('GET', '/api/auth/me')).status, 401);
  assert.strictEqual((await api('GET', '/api/auth/me', { token: 'garbage' })).status, 401);
});

test('products: search, category filter, sort, pagination, categories, 404', async () => {
  const search = await api('GET', '/api/products?search=MUG');
  assert.deepStrictEqual(search.body.products.map((p) => p.name), ['Ceramic Coffee Mug']);
  const weird = await api('GET', '/api/products?search=' + encodeURIComponent('(*'));
  assert.strictEqual(weird.status, 200); // regex characters don't crash the search
  const kitchen = await api('GET', '/api/products?category=Kitchen&sort=price-asc');
  assert.deepStrictEqual(kitchen.body.products.map((p) => p.price), [12.5, 18.9, 24]);
  const page2 = await api('GET', '/api/products?limit=5&page=3&sort=name');
  assert.strictEqual(page2.body.products.length, 2);
  assert.strictEqual(page2.body.pages, 3);
  const featured = await api('GET', '/api/products?featured=true');
  assert.strictEqual(featured.body.total, 4);
  const cats = await api('GET', '/api/products/categories');
  assert.deepStrictEqual(cats.body.find((c) => c.name === 'Kitchen'), { name: 'Kitchen', count: 3 });
  assert.strictEqual((await api('GET', '/api/products/nothing-here')).status, 404);
});

test('only admins can add, edit and delete products', async () => {
  const newProduct = { name: 'Linen Napkins (Set of 4)', category: 'Kitchen', price: 16.456, stock: 10 };
  assert.strictEqual((await api('POST', '/api/products', { body: newProduct })).status, 401);
  assert.strictEqual((await api('POST', '/api/products', { body: newProduct, token: alice.token })).status, 403);
  const created = await api('POST', '/api/products', { body: newProduct, token: admin.token });
  assert.strictEqual(created.status, 201);
  assert.strictEqual(created.body.slug, 'linen-napkins-set-of-4');
  assert.strictEqual(created.body.price, 16.46);
  const again = await api('POST', '/api/products', { body: newProduct, token: admin.token });
  assert.strictEqual(again.status, 409);
  const bad = await api('PUT', `/api/products/${created.body._id}`, { body: { price: -3 }, token: admin.token });
  assert.strictEqual(bad.status, 400);
  const edited = await api('PUT', `/api/products/${created.body._id}`, { body: { name: 'Linen Napkins', price: 15 }, token: admin.token });
  assert.strictEqual(edited.body.price, 15);
  assert.strictEqual(edited.body.slug, 'linen-napkins-set-of-4'); // links keep working
  const del = await api('DELETE', `/api/products/${created.body._id}`, { token: admin.token });
  assert.strictEqual(del.status, 200);
  assert.strictEqual((await api('DELETE', `/api/products/${created.body._id}`, { token: admin.token })).status, 404);
  assert.strictEqual((await api('PUT', '/api/products/123', { body: {}, token: admin.token })).status, 400);
});

test('placing an order uses database prices, adds shipping and lowers the stock', async () => {
  const res = await api('POST', '/api/orders', {
    token: alice.token,
    // the browser tries to send its own price: it must be ignored
    body: { items: [{ productId: mug._id, qty: 1, price: 0.01 }, { productId: mug._id, qty: 1 }], shipping },
  });
  assert.strictEqual(res.status, 201);
  assert.strictEqual(res.body.items.length, 1);
  assert.strictEqual(res.body.items[0].qty, 2);
  assert.strictEqual(res.body.subtotal, 25);
  assert.strictEqual(res.body.shippingFee, 5);
  assert.strictEqual(res.body.total, 30);
  assert.strictEqual(res.body.status, 'pending');
  assert.strictEqual((await Product.findById(mug._id)).stock, mug.stock - 2);

  // From 50 the shipping is free
  const big = await api('POST', '/api/orders', { token: alice.token, body: { items: [{ productId: mug._id, qty: 4 }], shipping } });
  assert.strictEqual(big.body.shippingFee, 0);
  assert.strictEqual(big.body.total, 50);
});

test('orders are refused when invalid, out of stock or not logged in', async () => {
  const items = [{ productId: shirt._id, qty: 1 }];
  assert.strictEqual((await api('POST', '/api/orders', { body: { items, shipping } })).status, 401);
  assert.strictEqual((await api('POST', '/api/orders', { token: bob.token, body: { items: [], shipping } })).status, 400);
  assert.strictEqual((await api('POST', '/api/orders', { token: bob.token, body: { items: [{ productId: shirt._id, qty: 0 }], shipping } })).status, 400);
  assert.strictEqual((await api('POST', '/api/orders', { token: bob.token, body: { items: [{ productId: shirt._id, qty: 21 }], shipping } })).status, 400);
  const noAddress = await api('POST', '/api/orders', { token: bob.token, body: { items, shipping: { ...shipping, address: '' } } });
  assert.strictEqual(noAddress.status, 400);
  assert.match(noAddress.body.message, /Address/);

  // Only 3 shirts: asking for 3 shirts + 1 mug works; the mug stock must not
  // be lowered when the shirt part fails
  const mugBefore = (await Product.findById(mug._id)).stock;
  const tooMany = await api('POST', '/api/orders', { token: bob.token, body: { items: [{ productId: mug._id, qty: 1 }, { productId: shirt._id, qty: 4 }], shipping } });
  assert.strictEqual(tooMany.status, 409);
  assert.match(tooMany.body.message, /Only 3 left/);
  assert.strictEqual((await Product.findById(mug._id)).stock, mugBefore);
  assert.strictEqual((await Product.findById(shirt._id)).stock, 3);
});

test('two people buying the last items at the same time: never oversold', async () => {
  const buy = (who) => api('POST', '/api/orders', { token: who.token, body: { items: [{ productId: shirt._id, qty: 2 }], shipping } });
  const results = await Promise.all([buy(alice), buy(bob)]);
  assert.deepStrictEqual(results.map((r) => r.status).sort(), [201, 409]);
  assert.strictEqual((await Product.findById(shirt._id)).stock, 1);
});

test('customers see only their own orders, and can cancel a pending one', async () => {
  const mine = await api('GET', '/api/orders/mine', { token: alice.token });
  assert.ok(mine.body.length >= 2);
  const orderId = mine.body.at(-1)._id;
  assert.strictEqual((await api('GET', `/api/orders/${orderId}`, { token: alice.token })).status, 200);
  assert.strictEqual((await api('GET', `/api/orders/${orderId}`, { token: bob.token })).status, 404);
  assert.strictEqual((await api('GET', `/api/orders/${orderId}`, { token: admin.token })).status, 200);
  assert.strictEqual((await api('GET', '/api/orders', { token: alice.token })).status, 403);
  assert.strictEqual((await api('POST', `/api/orders/${orderId}/cancel`, { token: bob.token })).status, 404);

  const before = (await Product.findById(mug._id)).stock;
  const cancel = await api('POST', `/api/orders/${orderId}/cancel`, { token: alice.token });
  assert.strictEqual(cancel.body.status, 'cancelled');
  assert.strictEqual((await Product.findById(mug._id)).stock, before + 2); // stock given back
  assert.strictEqual((await api('POST', `/api/orders/${orderId}/cancel`, { token: alice.token })).status, 409);
});

test('admin sees all orders and moves them pending -> shipped -> delivered', async () => {
  const all = await api('GET', '/api/orders', { token: admin.token });
  assert.ok(all.body.every((o) => o.user.email));
  const order = all.body.find((o) => o.status === 'pending');
  const skip = await api('PATCH', `/api/orders/${order._id}/status`, { token: admin.token, body: { status: 'delivered' } });
  assert.strictEqual(skip.status, 400);
  const shipped = await api('PATCH', `/api/orders/${order._id}/status`, { token: admin.token, body: { status: 'shipped' } });
  assert.strictEqual(shipped.body.status, 'shipped');
  // once shipped, the customer can't cancel it anymore
  const owner = all.body.find((o) => o._id === order._id).user.email === 'alice@kora.test' ? alice : bob;
  assert.strictEqual((await api('POST', `/api/orders/${order._id}/cancel`, { token: owner.token })).status, 409);
  const delivered = await api('PATCH', `/api/orders/${order._id}/status`, { token: admin.token, body: { status: 'delivered' } });
  assert.strictEqual(delivered.body.status, 'delivered');
  assert.strictEqual((await api('PATCH', `/api/orders/${order._id}/status`, { token: alice.token, body: { status: 'shipped' } })).status, 403);
});

test('unknown API routes and broken JSON get clear JSON errors', async () => {
  assert.strictEqual((await api('GET', '/api/nope')).status, 404);
  const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{bad' });
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.headers.get('x-powered-by'), null);
});
