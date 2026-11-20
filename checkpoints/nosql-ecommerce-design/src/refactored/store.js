// PART 2: the app's queries on the refactored schema. Mostly the same
// functions as version 1, with two differences: order items get the category
// and brand, and every query says where it may read from (connection.js).
import {
  cancelOrder,
  getProductBySlug,
  initialItem,
  ordersByStatus,
  ordersForCustomer,
  placeOrder,
  productsWithAttribute,
  searchProducts,
  updateOrderStatus,
} from '../initial/store.js';
import { CATALOG_READ, ORDER_READ, ORDER_WRITE } from './connection.js';
import { SCHEMA_VERSION } from './schema.js';

export { OrderError, NEXT } from '../initial/store.js';

export const buildItemV2 = (product, quantity) => ({
  ...initialItem(product, quantity),
  category: product.category.slug,
  brand: product.brand ?? 'unknown',
});

// Catalog: read from the nearest secondary, can be slightly stale.
export const searchCatalog = (db, query) => searchProducts(db, query, CATALOG_READ);
export const productPage = (db, slug) => getProductBySlug(db, slug, CATALOG_READ);
export const filterByAttribute = (db, k, v) => productsWithAttribute(db, k, v, CATALOG_READ);

export function trendingProducts(db, { category, limit = 10 } = {}) {
  return db
    .collection('products')
    .find({ status: 'active', ...(category && { categoryPath: category }) }, { ...CATALOG_READ, projection: { name: 1, sku: 1, priceCents: 1, sales30d: 1 } })
    .sort({ 'sales30d.units': -1 })
    .limit(limit)
    .toArray();
}

// Orders: majority writes, primary reads (a transaction always runs on the primary).
export const placeOrderV2 = (client, db, input) =>
  placeOrder(client, db, input, { buildItem: buildItemV2, extraFields: { schemaVersion: SCHEMA_VERSION } });
export const setOrderStatus = (db, orderId, status) => updateOrderStatus(db, orderId, status, ORDER_WRITE);
export const cancel = (client, db, orderId) => cancelOrder(client, db, orderId);
export const myOrders = (db, userId, opts) => ordersForCustomer(db, userId, opts, ORDER_READ);
export const backOfficeOrders = (db, status, opts) => ordersByStatus(db, status, opts, ORDER_READ);
