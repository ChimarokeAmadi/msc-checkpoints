// PART 1: the queries the e-commerce app runs on the initial schema.
import { ObjectId } from 'mongodb';

export const MAX_QUANTITY = 20;
export const FREE_SHIPPING_FROM_CENTS = 5000;
export const SHIPPING_CENTS = 500;

export class OrderError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

// ---------- Catalog ----------

// Search and browse. With `text`, it uses the text index and sorts by
// relevance. Without it, it browses a category with the
// {status, categoryPath, priceCents} index.
export async function searchProducts(db, { text, category, minPrice, maxPrice, sort = 'price', page = 1, limit = 20 } = {}, options = {}) {
  const filter = { status: 'active' };
  if (text) filter.$text = { $search: text };
  if (category) filter.categoryPath = category;
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.priceCents = {};
    if (minPrice !== undefined) filter.priceCents.$gte = minPrice;
    if (maxPrice !== undefined) filter.priceCents.$lte = maxPrice;
  }
  const projection = { name: 1, slug: 1, brand: 1, priceCents: 1, category: 1, rating: 1, stock: 1 };
  let order;
  if (text && sort === 'relevance') {
    projection.score = { $meta: 'textScore' };
    order = { score: { $meta: 'textScore' } };
  } else if (sort === 'price-desc') order = { priceCents: -1 };
  else order = { priceCents: 1 };

  return db
    .collection('products')
    .find(filter, { projection, ...options })
    .sort(order)
    .skip((page - 1) * limit)
    .limit(limit)
    .toArray();
}

export function getProductBySlug(db, slug, options = {}) {
  return db.collection('products').findOne({ slug, status: 'active' }, options);
}

// Filter on any attribute, e.g. { k: 'color', v: 'black' }.
export function productsWithAttribute(db, k, v, options = {}) {
  return db.collection('products').find({ status: 'active', attrs: { $elemMatch: { k, v } } }, options).toArray();
}

// ---------- Orders ----------

// The order number is made from the order's ObjectId, which is unique by
// construction (time + random value + counter). So no central counter is
// needed: a counter document would be a bottleneck at thousands of orders per
// second, and it's also what makes this work later on a sharded cluster.
export function newOrderNumber(id, date = id.getTimestamp()) {
  const day = date.toISOString().slice(0, 10).replace(/-/g, '');
  return `ORD-${day}-${id.toHexString().toUpperCase()}`;
}

function mergeLines(lines) {
  if (!Array.isArray(lines) || lines.length === 0) throw new OrderError('EMPTY', 'The order has no items');
  const bySku = new Map();
  for (const { sku, quantity } of lines) {
    if (!Number.isInteger(quantity) || quantity < 1) throw new OrderError('BAD_QUANTITY', `Bad quantity for ${sku}`);
    bySku.set(sku, (bySku.get(sku) || 0) + quantity);
  }
  for (const [sku, quantity] of bySku) {
    if (quantity > MAX_QUANTITY) throw new OrderError('BAD_QUANTITY', `At most ${MAX_QUANTITY} of ${sku}`);
  }
  return [...bySku].map(([sku, quantity]) => ({ sku, quantity }));
}

// Builds the order item stored in the order. The refactored schema adds
// fields here, so it's passed in as a parameter.
export const initialItem = (product, quantity) => ({
  productId: product._id,
  sku: product.sku,
  name: product.name,
  unitPriceCents: product.priceCents,
  quantity,
  lineTotalCents: product.priceCents * quantity,
});

// Places an order in ONE multi-document transaction: every stock decrement
// and the order insert either all happen or none happen. The stock update is
// conditional ({ stock: { $gte: quantity } }), so two customers can never buy
// the last item twice, even at the same moment.
export async function placeOrder(client, db, { userId, items, shippingAddress }, { buildItem = initialItem, extraFields = {}, transactionOptions = {} } = {}) {
  const lines = mergeLines(items);
  const session = client.startSession();
  try {
    let order;
    await session.withTransaction(
      async () => {
        const user = await db.collection('users').findOne({ _id: new ObjectId(userId) }, { session });
        if (!user) throw new OrderError('NO_USER', 'Unknown customer');
        const address = shippingAddress || user.addresses?.[0];
        if (!address) throw new OrderError('NO_ADDRESS', 'No shipping address');

        const orderItems = [];
        for (const { sku, quantity } of lines) {
          const product = await db
            .collection('products')
            .findOneAndUpdate({ sku, status: 'active', stock: { $gte: quantity } }, { $inc: { stock: -quantity } }, { session, returnDocument: 'after' });
          if (!product) throw new OrderError('OUT_OF_STOCK', `Not enough stock for ${sku}`);
          orderItems.push(buildItem(product, quantity));
        }
        const subtotalCents = orderItems.reduce((sum, i) => sum + i.lineTotalCents, 0);
        const shippingCents = subtotalCents >= FREE_SHIPPING_FROM_CENTS ? 0 : SHIPPING_CENTS;
        const now = new Date();
        const _id = new ObjectId();
        order = {
          _id,
          orderNumber: newOrderNumber(_id, now),
          customer: { userId: user._id, name: user.name, email: user.email, shippingAddress: address },
          items: orderItems,
          totals: { subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents },
          status: 'pending',
          statusHistory: [{ status: 'pending', at: now }],
          createdAt: now,
          updatedAt: now,
          ...extraFields,
        };
        await db.collection('orders').insertOne(order, { session });
      },
      // majority: the order is only confirmed once most of the replica set
      // has it, so it survives the primary crashing right after.
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, ...transactionOptions },
    );
    return order;
  } finally {
    await session.endSession();
  }
}

// Which status each status can move to. "delivered" and "cancelled" are final.
export const NEXT = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

// Changes the delivery status in ONE atomic update on one document. The
// filter only matches if the order is still in a status that's allowed to
// move to `to`, so two workers can't both ship the same order, and an order
// can't go from "delivered" back to "shipped". No transaction needed.
export async function updateOrderStatus(db, orderId, to, options = {}) {
  if (to === 'cancelled') throw new OrderError('USE_CANCEL', 'Use cancelOrder to cancel (it restores the stock)');
  const from = Object.keys(NEXT).filter((s) => NEXT[s].includes(to));
  const now = new Date();
  const result = await db
    .collection('orders')
    .findOneAndUpdate(
      { _id: new ObjectId(orderId), status: { $in: from } },
      { $set: { status: to, updatedAt: now }, $push: { statusHistory: { status: to, at: now } } },
      { returnDocument: 'after', writeConcern: { w: 'majority' }, ...options },
    );
  if (!result) throw new OrderError('BAD_TRANSITION', `Order can't move to "${to}" from its current status`);
  return result;
}

// Cancelling changes the order AND gives the stock back, so it's a transaction.
export async function cancelOrder(client, db, orderId, { transactionOptions = {} } = {}) {
  const session = client.startSession();
  try {
    let order;
    await session.withTransaction(
      async () => {
        const now = new Date();
        order = await db
          .collection('orders')
          .findOneAndUpdate(
            { _id: new ObjectId(orderId), status: { $in: ['pending', 'paid'] } },
            { $set: { status: 'cancelled', updatedAt: now }, $push: { statusHistory: { status: 'cancelled', at: now } } },
            { session, returnDocument: 'after' },
          );
        if (!order) throw new OrderError('BAD_TRANSITION', 'Only pending or paid orders can be cancelled');
        await db
          .collection('products')
          .bulkWrite(order.items.map((i) => ({ updateOne: { filter: { _id: i.productId }, update: { $inc: { stock: i.quantity } } } })), { session });
      },
      { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, ...transactionOptions },
    );
    return order;
  } finally {
    await session.endSession();
  }
}

export function ordersForCustomer(db, userId, { limit = 10 } = {}, options = {}) {
  return db
    .collection('orders')
    .find({ 'customer.userId': new ObjectId(userId) }, options)
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();
}

export function ordersByStatus(db, status, { limit = 50 } = {}, options = {}) {
  return db.collection('orders').find({ status }, options).sort({ createdAt: -1 }).limit(limit).toArray();
}
