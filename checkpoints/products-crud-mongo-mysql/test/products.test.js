// The SAME tests run against both controllers, to prove they behave the same.
// Uses temporary in-memory MongoDB and MySQL servers.
// Run with: npm test

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = '';
process.env.MYSQL_HOST = '';

const { describe, test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert');
const request = require('supertest');

const { createApp } = require('../src/app');
const { connectMongo, disconnectMongo } = require('../src/config/mongo');
const { connectMySQL, disconnectMySQL, getPool } = require('../src/config/mysql');
const Product = require('../src/models/Product');

const app = createApp();
const log = console.log;

before(async () => {
  console.log = () => {}; // hide the "connected" messages
  await Promise.all([connectMongo(), connectMySQL()]);
  console.log = log;
});

after(async () => {
  await Promise.all([disconnectMongo(), disconnectMySQL()]);
});

const databases = [
  { name: 'MongoDB (NoSQLcontroller)', base: '/mongo/products', missingId: '507f1f77bcf86cd799439011', badId: 'abc' },
  { name: 'MySQL (SQLcontroller)', base: '/sql/products', missingId: '999999', badId: 'abc' },
];

for (const db of databases) {
  describe(db.name, () => {
    beforeEach(async () => {
      await Product.deleteMany({});
      await getPool().query('TRUNCATE TABLE products');
    });

    const create = (body) => request(app).post(db.base).send(body);

    test('POST creates a product with an auto id and inStock defaulting to true', async () => {
      const res = await create({ name: '  Wireless Mouse ', price: 25.5, category: 'Electronics' });
      assert.equal(res.status, 201);
      const p = res.body.data;
      assert.equal(typeof p.id, 'string');
      assert.ok(p.id.length > 0);
      assert.equal(p.name, 'Wireless Mouse');
      assert.equal(p.price, 25.5);
      assert.equal(p.category, 'Electronics');
      assert.equal(p.inStock, true);
      assert.ok(p.createdAt);
    });

    test('category is optional and inStock can be false', async () => {
      const res = await create({ name: 'Notebook', price: 3, inStock: false });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.category, null);
      assert.equal(res.body.data.inStock, false);
    });

    test('POST rejects missing or wrong fields', async () => {
      let res = await create({ price: 10 });
      assert.equal(res.status, 400);
      assert.match(res.body.message, /name is required/);

      res = await create({ name: 'Pen' });
      assert.match(res.body.message, /price is required/);

      res = await create({ name: 'Pen', price: '10' });
      assert.match(res.body.message, /price must be a number/);

      res = await create({ name: 'Pen', price: -1 });
      assert.match(res.body.message, /between 0/);

      res = await create({ name: 'Pen', price: 1, inStock: 'yes' });
      assert.match(res.body.message, /inStock must be true or false/);
    });

    test('GET /products lists all products in creation order', async () => {
      await create({ name: 'A', price: 1 });
      await create({ name: 'B', price: 2 });
      await create({ name: 'C', price: 3 });
      const res = await request(app).get(db.base);
      assert.equal(res.status, 200);
      assert.equal(res.body.results, 3);
      assert.deepEqual(res.body.data.map((p) => p.name), ['A', 'B', 'C']);
    });

    test('GET /products/:id returns one product, 404 if missing, 400 if the id is invalid', async () => {
      const { body } = await create({ name: 'Keyboard', price: 45.99 });
      const res = await request(app).get(`${db.base}/${body.data.id}`);
      assert.equal(res.status, 200);
      assert.deepEqual(res.body.data, body.data);

      assert.equal((await request(app).get(`${db.base}/${db.missingId}`)).status, 404);
      assert.equal((await request(app).get(`${db.base}/${db.badId}`)).status, 400);
    });

    test('PUT updates only the fields sent', async () => {
      const { body } = await create({ name: 'Desk Lamp', price: 30, category: 'Home' });
      const res = await request(app).put(`${db.base}/${body.data.id}`).send({ price: 27.99, inStock: false });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.name, 'Desk Lamp');
      assert.equal(res.body.data.category, 'Home');
      assert.equal(res.body.data.price, 27.99);
      assert.equal(res.body.data.inStock, false);

      // and it's really saved
      const again = await request(app).get(`${db.base}/${body.data.id}`);
      assert.equal(again.body.data.price, 27.99);

      // category can be removed with null
      const cleared = await request(app).put(`${db.base}/${body.data.id}`).send({ category: null });
      assert.equal(cleared.body.data.category, null);
    });

    test('PUT validation and missing products', async () => {
      const { body } = await create({ name: 'Chair', price: 80 });
      let res = await request(app).put(`${db.base}/${body.data.id}`).send({});
      assert.equal(res.status, 400);
      assert.match(res.body.message, /at least one field/);

      res = await request(app).put(`${db.base}/${body.data.id}`).send({ name: '' });
      assert.equal(res.status, 400);

      res = await request(app).put(`${db.base}/${db.missingId}`).send({ price: 1 });
      assert.equal(res.status, 404);
    });

    test('DELETE removes the product and returns it', async () => {
      const { body } = await create({ name: 'Old Phone', price: 50 });
      const res = await request(app).delete(`${db.base}/${body.data.id}`);
      assert.equal(res.status, 200);
      assert.equal(res.body.message, 'Product deleted');
      assert.equal(res.body.data.name, 'Old Phone');

      assert.equal((await request(app).get(`${db.base}/${body.data.id}`)).status, 404);
      assert.equal((await request(app).delete(`${db.base}/${body.data.id}`)).status, 404);
    });

    test('prices are kept to 2 decimals', async () => {
      const res = await create({ name: 'Gum', price: 0.129 });
      assert.equal(res.body.data.price, 0.13);
    });

    test('injection attempts are stored as plain text', async () => {
      const name = "Robert'); DROP TABLE products; --";
      const res = await create({ name, price: 1, category: '{"$gt": ""}' });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.name, name);

      const list = await request(app).get(db.base);
      assert.equal(list.body.results, 1); // the table/collection is still there
    });

    test('broken JSON gives a clear 400', async () => {
      const res = await request(app).post(db.base).set('Content-Type', 'application/json').send('{"name": ');
      assert.equal(res.status, 400);
      assert.equal(res.body.message, 'The request body is not valid JSON');
    });
  });
}

describe('both databases', () => {
  test('return exactly the same fields for the same product', async () => {
    const body = { name: 'Same Thing', price: 9.99, category: 'Test', inStock: true };
    const mongo = await request(app).post('/mongo/products').send(body);
    const sql = await request(app).post('/sql/products').send(body);
    assert.deepEqual(Object.keys(mongo.body.data).sort(), Object.keys(sql.body.data).sort());
    const strip = ({ id, createdAt, updatedAt, ...rest }) => rest;
    assert.deepEqual(strip(mongo.body.data), strip(sql.body.data));
  });

  test('the MySQL table matches the model', async () => {
    const [cols] = await getPool().query(
      `SELECT COLUMN_NAME AS name, DATA_TYPE AS type, IS_NULLABLE AS nullable, COLUMN_DEFAULT AS def, EXTRA AS extra
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' ORDER BY ORDINAL_POSITION`,
    );
    const byName = Object.fromEntries(cols.map((c) => [c.name, c]));
    assert.match(byName.id.extra, /auto_increment/);
    assert.equal(byName.name.nullable, 'NO');
    assert.equal(byName.price.type, 'decimal');
    assert.equal(byName.price.nullable, 'NO');
    assert.equal(byName.category.nullable, 'YES');
    assert.equal(byName.in_stock.type, 'tinyint'); // MySQL's BOOLEAN
    assert.equal(byName.in_stock.def, '1');
  });
});
