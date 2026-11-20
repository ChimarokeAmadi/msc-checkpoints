// PART 2: moves existing orders from schema version 1 to version 2.
// It copies each product's category and brand into the order items, in
// batches, and marks the order schemaVersion: 2. It can be stopped and
// started again: it only picks up orders that aren't migrated yet.
import { SCHEMA_VERSION } from './schema.js';

export async function migrateOrdersToV2(db, { batchSize = 1000 } = {}) {
  const orders = db.collection('orders');
  const products = db.collection('products');
  const cache = new Map();
  let migrated = 0;

  const cursor = orders.find({ schemaVersion: { $ne: SCHEMA_VERSION } }, { projection: { items: 1 } }).batchSize(batchSize);
  let batch = [];
  const flush = async () => {
    if (!batch.length) return;
    // Look up only the products we haven't seen yet, in one query per batch.
    const missing = new Map();
    for (const o of batch) for (const i of o.items) if (!cache.has(String(i.productId))) missing.set(String(i.productId), i.productId);
    if (missing.size) {
      const found = await products.find({ _id: { $in: [...missing.values()] } }, { projection: { 'category.slug': 1, brand: 1 } }).toArray();
      for (const p of found) cache.set(String(p._id), { category: p.category.slug, brand: p.brand || 'unknown' });
    }
    await orders.bulkWrite(
      batch.map((o) => ({
        updateOne: {
          // Only if still version 1: safe if two copies of the script run.
          filter: { _id: o._id, schemaVersion: { $ne: SCHEMA_VERSION } },
          update: {
            $set: {
              schemaVersion: SCHEMA_VERSION,
              items: o.items.map((i) => ({ ...i, ...(cache.get(String(i.productId)) || { category: 'unknown', brand: 'unknown' }) })),
            },
          },
        },
      })),
      { ordered: false },
    );
    migrated += batch.length;
    batch = [];
  };

  for await (const order of cursor) {
    batch.push(order);
    if (batch.length >= batchSize) await flush();
  }
  await flush();
  return migrated;
}
