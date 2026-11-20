// PART 2: the refactored schema (version 2).
//
// What changes compared to version 1 (src/initial/schema.js):
//  1. Order items carry a copy of the product's category and brand, so sales
//     can be analysed without joining back to products (denormalization).
//  2. New pre-aggregated collections, sales_daily_product and
//     sales_daily_category, which the analytics queries read instead of
//     scanning millions of orders.
//  3. products get a `sales30d` summary, so the shop can sort by "trending".
//  4. orders is ready to be sharded on a hashed customer id: the unique index
//     on orderNumber is replaced (MongoDB can't enforce a unique index across
//     shards unless it starts with the shard key), and there's a hashed
//     index for the shard key.
//  5. orders get a schemaVersion field and an index on updatedAt, which the
//     incremental analytics job uses to find what changed.
import { INDEXES as V1_INDEXES, ORDER_STATUSES, ordersValidator as ordersV1, productsValidator as productsV1, usersValidator } from '../initial/schema.js';

export const SCHEMA_VERSION = 2;

const clone = (o) => structuredClone(o);

export const productsValidator = clone(productsV1);
productsValidator.$jsonSchema.properties.sales30d = {
  bsonType: 'object',
  required: ['units', 'revenueCents', 'computedAt'],
  properties: { units: { bsonType: ['int', 'long'], minimum: 0 }, revenueCents: { bsonType: ['int', 'long'], minimum: 0 }, computedAt: { bsonType: 'date' } },
};

export const ordersValidator = clone(ordersV1);
{
  const s = ordersValidator.$jsonSchema;
  s.required.push('schemaVersion');
  s.properties.schemaVersion = { enum: [SCHEMA_VERSION] };
  const item = s.properties.items.items;
  item.required.push('category', 'brand');
  item.properties.category = { bsonType: 'string' };
  item.properties.brand = { bsonType: 'string' };
}

const salesDailyProductValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'day', 'productId', 'sku', 'category', 'units', 'revenueCents', 'orders', 'computedAt'],
    properties: {
      _id: { bsonType: 'object', required: ['day', 'productId'] },
      day: { bsonType: 'date' },
      productId: { bsonType: 'objectId' },
      units: { bsonType: ['int', 'long'], minimum: 0 },
      revenueCents: { bsonType: ['int', 'long'], minimum: 0 },
      orders: { bsonType: ['int', 'long'], minimum: 0 },
      computedAt: { bsonType: 'date' },
    },
  },
};

const salesDailyCategoryValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['_id', 'day', 'category', 'units', 'revenueCents', 'orders', 'computedAt'],
    properties: {
      _id: { bsonType: 'object', required: ['day', 'category'] },
      day: { bsonType: 'date' },
      category: { bsonType: 'string' },
      units: { bsonType: ['int', 'long'], minimum: 0 },
      revenueCents: { bsonType: ['int', 'long'], minimum: 0 },
      orders: { bsonType: ['int', 'long'], minimum: 0 },
      computedAt: { bsonType: 'date' },
    },
  },
};

export const VALIDATORS = {
  users: usersValidator,
  products: productsValidator,
  orders: ordersValidator,
  sales_daily_product: salesDailyProductValidator,
  sales_daily_category: salesDailyCategoryValidator,
};

export const INDEXES = {
  users: V1_INDEXES.users,
  products: [
    ...V1_INDEXES.products,
    // "Trending in this category": the most sold in the last 30 days first.
    { key: { status: 1, categoryPath: 1, 'sales30d.units': -1 } },
  ],
  orders: [
    // The shard key index. Hashing spreads customers evenly over the shards,
    // and every "my orders" query (which has the customer id) goes to one shard.
    { key: { 'customer.userId': 'hashed' } },
    { key: { 'customer.userId': 1, createdAt: -1 } },
    { key: { status: 1, createdAt: -1 } },
    // Not unique any more: uniqueness comes from the ObjectId in the number.
    { key: { orderNumber: 1 }, name: 'orderNumber_lookup' },
    // The analytics job looks for orders changed since its last run, then
    // recomputes the days those orders were created on.
    { key: { updatedAt: 1 } },
    { key: { createdAt: 1 } },
  ],
  sales_daily_product: [{ key: { day: 1 } }, { key: { productId: 1, day: 1 } }, { key: { category: 1, day: 1 } }],
  sales_daily_category: [{ key: { category: 1, day: 1 } }, { key: { day: 1 } }],
  jobs: [],
};

// Indexes from version 1 that version 2 removes.
export const DROPPED_INDEXES = { orders: ['orderNumber_1'] };

export async function createRefactoredCollections(db, { validationLevel = 'strict' } = {}) {
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const name of Object.keys(INDEXES)) {
    const validator = VALIDATORS[name];
    if (existing.has(name)) {
      if (validator) await db.command({ collMod: name, validator, validationLevel });
    } else {
      await db.createCollection(name, validator ? { validator, validationLevel } : {});
    }
  }
}

export async function createRefactoredIndexes(db) {
  for (const [name, list] of Object.entries(DROPPED_INDEXES)) {
    const have = new Set((await db.collection(name).indexes()).map((i) => i.name));
    for (const index of list) if (have.has(index)) await db.collection(name).dropIndex(index);
  }
  for (const [name, list] of Object.entries(INDEXES)) {
    if (list.length) await db.collection(name).createIndexes(list);
  }
}

export { ORDER_STATUSES };
