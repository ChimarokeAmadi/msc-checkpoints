// PART 1: the initial schema (version 1).
//
// Three collections: users, products and orders. MongoDB doesn't force a
// schema, but I add a $jsonSchema validator to each collection so bad data is
// refused by the database itself, not only by the application.
// Money is stored in cents (integers) so there are never rounding errors.

export const ORDER_STATUSES = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];

const int = (min, max) => ({ bsonType: ['int', 'long'], minimum: min, ...(max !== undefined && { maximum: max }) });
const str = (maxLength = 200) => ({ bsonType: 'string', minLength: 1, maxLength });

const address = {
  bsonType: 'object',
  required: ['line1', 'city', 'country', 'postalCode'],
  properties: { line1: str(), city: str(100), country: str(2), postalCode: str(20) },
};

export const usersValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['email', 'name', 'createdAt'],
    properties: {
      email: { bsonType: 'string', pattern: '^[^@\\s]+@[^@\\s]+$' },
      name: str(),
      // Addresses belong to one user and are always read with the user, so
      // they're embedded (one document read instead of a join).
      addresses: { bsonType: 'array', maxItems: 10, items: address },
      createdAt: { bsonType: 'date' },
    },
  },
};

export const productsValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['sku', 'name', 'slug', 'priceCents', 'currency', 'category', 'categoryPath', 'stock', 'status'],
    properties: {
      sku: { bsonType: 'string', pattern: '^[A-Z0-9-]{3,30}$' },
      name: str(),
      slug: { bsonType: 'string', pattern: '^[a-z0-9-]+$' },
      description: str(5000),
      brand: str(100),
      // The category name is copied into the product (denormalized) because
      // the product page always shows it and categories almost never change.
      category: { bsonType: 'object', required: ['slug', 'name'], properties: { slug: str(), name: str() } },
      // "electronics" > "audio" > "headphones": one index finds a product
      // from any level of the category tree.
      categoryPath: { bsonType: 'array', minItems: 1, items: { bsonType: 'string' } },
      priceCents: int(0),
      currency: { enum: ['USD'] },
      // Attribute pattern: products have very different attributes (a shirt
      // has a size, headphones have a battery life), so they're stored as
      // key/value pairs that a single index can cover.
      attrs: {
        bsonType: 'array',
        maxItems: 30,
        items: { bsonType: 'object', required: ['k', 'v'], properties: { k: str(50), v: { bsonType: ['string', 'int', 'double', 'bool'] } } },
      },
      stock: int(0),
      status: { enum: ['active', 'hidden'] },
      rating: { bsonType: 'object', properties: { avg: { bsonType: ['double', 'int'], minimum: 0, maximum: 5 }, count: int(0) } },
      createdAt: { bsonType: 'date' },
    },
  },
};

const orderItem = {
  bsonType: 'object',
  required: ['productId', 'sku', 'name', 'unitPriceCents', 'quantity', 'lineTotalCents'],
  properties: {
    productId: { bsonType: 'objectId' },
    sku: { bsonType: 'string' },
    name: str(),
    unitPriceCents: int(0),
    quantity: int(1, 20),
    lineTotalCents: int(0),
  },
};

export const ordersValidator = {
  $jsonSchema: {
    bsonType: 'object',
    required: ['orderNumber', 'customer', 'items', 'totals', 'status', 'statusHistory', 'createdAt', 'updatedAt'],
    properties: {
      orderNumber: { bsonType: 'string' },
      // Extended reference: the order keeps the user's id plus a copy of the
      // name, email and address AT THE TIME OF THE ORDER. If the customer
      // moves later, old orders still show where they were delivered.
      customer: {
        bsonType: 'object',
        required: ['userId', 'name', 'email', 'shippingAddress'],
        properties: { userId: { bsonType: 'objectId' }, name: str(), email: { bsonType: 'string' }, shippingAddress: address },
      },
      // Items are embedded: an order is always read and written as a whole,
      // and the price is a snapshot (changing a product's price must not
      // change orders that are already placed).
      items: { bsonType: 'array', minItems: 1, maxItems: 100, items: orderItem },
      totals: {
        bsonType: 'object',
        required: ['subtotalCents', 'shippingCents', 'totalCents'],
        properties: { subtotalCents: int(0), shippingCents: int(0), totalCents: int(0) },
      },
      status: { enum: ORDER_STATUSES },
      statusHistory: {
        bsonType: 'array',
        items: { bsonType: 'object', required: ['status', 'at'], properties: { status: { enum: ORDER_STATUSES }, at: { bsonType: 'date' } } },
      },
      createdAt: { bsonType: 'date' },
      updatedAt: { bsonType: 'date' },
    },
  },
};

// Every index matches a query the app actually runs (see docs/1-initial-schema.md).
export const INDEXES = {
  users: [{ key: { email: 1 }, unique: true }],
  products: [
    { key: { sku: 1 }, unique: true },
    { key: { slug: 1 }, unique: true },
    // Full-text search on the name, brand and description. A match in the
    // name counts 10x more than one in the description.
    { key: { name: 'text', brand: 'text', description: 'text' }, name: 'product_search', weights: { name: 10, brand: 5, description: 1 } },
    // Browse a category sorted by price: equality fields first, then the
    // sort field (the ESR rule: Equality, Sort, Range).
    { key: { status: 1, categoryPath: 1, priceCents: 1 } },
    { key: { 'attrs.k': 1, 'attrs.v': 1 } },
  ],
  orders: [
    { key: { orderNumber: 1 }, unique: true },
    // "My orders", newest first.
    { key: { 'customer.userId': 1, createdAt: -1 } },
    // Back office: orders by status (e.g. all "paid" orders to ship).
    { key: { status: 1, createdAt: -1 } },
  ],
};

export async function createInitialSchema(db) {
  const validators = { users: usersValidator, products: productsValidator, orders: ordersValidator };
  const existing = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map((c) => c.name));
  for (const [name, validator] of Object.entries(validators)) {
    if (existing.has(name)) await db.command({ collMod: name, validator, validationLevel: 'strict' });
    else await db.createCollection(name, { validator, validationLevel: 'strict', validationAction: 'error' });
    await db.collection(name).createIndexes(INDEXES[name]);
  }
}
