// Generates a realistic data set: products, users and months of past orders.
// It's deterministic (seeded random), so every run gives the same data.
import { ObjectId } from 'mongodb';

export const CATEGORIES = [
  { path: ['electronics', 'audio', 'headphones'], name: 'Headphones', brands: ['Sonora', 'Wavelab'], items: ['Wireless Headphones', 'Noise Cancelling Headphones', 'Sport Earbuds'], price: [2900, 34900] },
  { path: ['electronics', 'audio', 'speakers'], name: 'Speakers', brands: ['Sonora', 'Boomtree'], items: ['Bluetooth Speaker', 'Smart Speaker', 'Soundbar'], price: [3900, 49900] },
  { path: ['electronics', 'computers', 'laptops'], name: 'Laptops', brands: ['Northbook', 'Corelite'], items: ['Ultrabook 13"', 'Laptop 15"', 'Gaming Laptop'], price: [59900, 249900] },
  { path: ['electronics', 'phones'], name: 'Phones', brands: ['Pixelon', 'Corelite'], items: ['Smartphone', 'Phone Case', 'USB-C Charger'], price: [1500, 129900] },
  { path: ['home', 'kitchen'], name: 'Kitchen', brands: ['Casa Viva', 'Ironleaf'], items: ['Chef Knife', 'Coffee Grinder', 'Cast Iron Pan'], price: [1900, 19900] },
  { path: ['home', 'furniture'], name: 'Furniture', brands: ['Casa Viva', 'Oakline'], items: ['Desk Chair', 'Standing Desk', 'Bookshelf'], price: [8900, 69900] },
  { path: ['sports', 'fitness'], name: 'Fitness', brands: ['Peakform', 'Ironleaf'], items: ['Yoga Mat', 'Adjustable Dumbbells', 'Resistance Bands'], price: [1500, 39900] },
  { path: ['sports', 'outdoor'], name: 'Outdoor', brands: ['Trailmark', 'Peakform'], items: ['Hiking Backpack', 'Camping Tent', 'Water Bottle'], price: [1200, 44900] },
  { path: ['fashion', 'shoes'], name: 'Shoes', brands: ['Strider', 'Trailmark'], items: ['Running Shoes', 'Hiking Boots', 'Sneakers'], price: [4900, 18900] },
  { path: ['fashion', 'bags'], name: 'Bags', brands: ['Strider', 'Oakline'], items: ['Leather Tote', 'Laptop Bag', 'Travel Duffel'], price: [2900, 24900] },
];
const COLORS = ['black', 'white', 'blue', 'red', 'green', 'grey'];
const CITIES = [['Lagos', 'NG'], ['Abuja', 'NG'], ['Nairobi', 'KE'], ['Accra', 'GH'], ['London', 'GB'], ['Berlin', 'DE'], ['Austin', 'US'], ['Toronto', 'CA']];
const FIRST = ['Ada', 'Chidi', 'Ngozi', 'Tunde', 'Amara', 'Kofi', 'Zainab', 'Liam', 'Sofia', 'Noah', 'Emma', 'Yusuf'];
const LAST = ['Okafor', 'Mensah', 'Adeyemi', 'Kamau', 'Smith', 'Müller', 'Garcia', 'Nwosu', 'Brown', 'Diallo'];

export function rng(seed = 42) {
  let s = seed;
  const next = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  return { next, int: (min, max) => min + Math.floor(next() * (max - min + 1)), pick: (arr) => arr[Math.floor(next() * arr.length)] };
}

const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function makeProducts(count = 200, seed = 1) {
  const r = rng(seed);
  const products = [];
  for (let i = 0; i < count; i++) {
    const cat = CATEGORIES[i % CATEGORIES.length];
    const brand = r.pick(cat.brands);
    const item = r.pick(cat.items);
    const color = r.pick(COLORS);
    const name = `${brand} ${item} (${color})`;
    const priceCents = Math.round(r.int(cat.price[0], cat.price[1]) / 100) * 100 - 1;
    products.push({
      _id: new ObjectId(),
      sku: `${cat.path.at(-1).slice(0, 3).toUpperCase()}-${String(i + 1).padStart(5, '0')}`,
      name,
      slug: `${slugify(name)}-${i + 1}`,
      description: `${item} by ${brand} in ${color}. Great for everyday use, ${r.pick(['lightweight', 'durable', 'easy to clean', 'made to last', 'award winning'])} and ${r.pick(['comfortable', 'powerful', 'compact', 'quiet', 'stylish'])}.`,
      brand,
      category: { slug: cat.path.at(-1), name: cat.name },
      categoryPath: cat.path,
      priceCents,
      currency: 'USD',
      attrs: [{ k: 'color', v: color }, ...(cat.path[0] === 'fashion' ? [{ k: 'size', v: r.pick(['S', 'M', 'L', 'XL']) }] : [])],
      stock: r.int(50, 5000),
      status: 'active',
      rating: { avg: Math.round((3 + r.next() * 2) * 10) / 10, count: r.int(0, 900) },
      createdAt: new Date('2026-01-01T00:00:00Z'),
    });
  }
  return products;
}

export function makeUsers(count = 500, seed = 2) {
  const r = rng(seed);
  return Array.from({ length: count }, (_, i) => {
    const first = r.pick(FIRST);
    const last = r.pick(LAST);
    const [city, country] = r.pick(CITIES);
    return {
      _id: new ObjectId(),
      email: `${first}.${last}.${i}@example.com`.toLowerCase(),
      name: `${first} ${last}`,
      addresses: [{ line1: `${r.int(1, 200)} Market Street`, city, country, postalCode: String(r.int(10000, 99999)) }],
      createdAt: new Date('2026-01-01T00:00:00Z'),
    };
  });
}

// Past orders in the VERSION 1 shape (that's what's in the database before
// the refactor). Fitness and outdoor sell more and more over the period, so
// the analytics have a real trend to find.
export function makeHistoricalOrders(products, users, { count = 20000, days = 90, end = new Date('2026-11-01T00:00:00Z'), seed = 3 } = {}) {
  const r = rng(seed);
  const byCat = new Map();
  for (const p of products) {
    const k = p.categoryPath.join('/');
    if (!byCat.has(k)) byCat.set(k, []);
    byCat.get(k).push(p);
  }
  const catKeys = [...byCat.keys()];
  const orders = [];
  for (let n = 0; n < count; n++) {
    const dayIndex = Math.floor(Math.sqrt(r.next()) * days); // more orders recently (the shop grows)
    const createdAt = new Date(end.getTime() - (days - dayIndex) * 86400000 + r.int(0, 86399) * 1000);
    const progress = dayIndex / days;
    const user = r.pick(users);
    const lineCount = r.int(1, 3);
    const items = [];
    for (let l = 0; l < lineCount; l++) {
      // Fitness/outdoor weight goes from 1x to 4x over the period.
      let cat = r.pick(catKeys);
      if (r.next() < 0.35 * progress) cat = r.pick(['sports/fitness', 'sports/outdoor']);
      const p = r.pick(byCat.get(cat));
      if (items.some((i) => i.sku === p.sku)) continue;
      const quantity = r.int(1, 3);
      items.push({ productId: p._id, sku: p.sku, name: p.name, unitPriceCents: p.priceCents, quantity, lineTotalCents: p.priceCents * quantity });
    }
    const subtotalCents = items.reduce((s, i) => s + i.lineTotalCents, 0);
    const shippingCents = subtotalCents >= 5000 ? 0 : 500;
    const age = (end - createdAt) / 86400000;
    const status = r.next() < 0.05 ? 'cancelled' : age > 7 ? 'delivered' : age > 3 ? 'shipped' : age > 1 ? 'paid' : 'pending';
    const updatedAt = new Date(Math.min(end.getTime(), createdAt.getTime() + 2 * 86400000));
    orders.push({
      orderNumber: `ORD-${createdAt.toISOString().slice(0, 10).replace(/-/g, '')}-H${String(n).padStart(7, '0')}`,
      customer: { userId: user._id, name: user.name, email: user.email, shippingAddress: user.addresses[0] },
      items,
      totals: { subtotalCents, shippingCents, totalCents: subtotalCents + shippingCents },
      status,
      statusHistory: [{ status: 'pending', at: createdAt }, ...(status !== 'pending' ? [{ status, at: updatedAt }] : [])],
      createdAt,
      updatedAt: status === 'pending' ? createdAt : updatedAt,
    });
  }
  return orders;
}
