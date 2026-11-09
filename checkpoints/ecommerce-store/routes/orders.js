// routes/orders.js
// Customer:  POST /api/orders, GET /api/orders/mine, GET /api/orders/:id, POST /api/orders/:id/cancel
// Admin:     GET /api/orders, PATCH /api/orders/:id/status

const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const { money } = require('../models/Product');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth); // every order route needs a logged-in user

const FREE_SHIPPING_FROM = 50;
const SHIPPING_FEE = 5;
const MAX_QTY = 20;

// Puts the bought quantities back in stock (used when an order is cancelled
// or when placing an order fails halfway)
async function restoreStock(items) {
  await Promise.all(items.map((i) => Product.updateOne({ _id: i.product }, { $inc: { stock: i.qty } })));
}

// POST /api/orders  body: { items: [{ productId, qty }], shipping: { fullName, address, city, phone } }
router.post('/', async (req, res) => {
  const { items, shipping } = req.body ?? {};
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: 'Your cart is empty' });

  // Add up the same product if it appears twice
  const wanted = new Map();
  for (const item of items) {
    const qty = Number(item?.qty);
    if (!mongoose.isValidObjectId(item?.productId) || !Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ message: 'Invalid item in the cart' });
    }
    wanted.set(String(item.productId), (wanted.get(String(item.productId)) ?? 0) + qty);
  }
  for (const qty of wanted.values()) {
    if (qty > MAX_QTY) return res.status(400).json({ message: `You can buy at most ${MAX_QTY} of each product` });
  }

  // Prices ALWAYS come from the database, never from the browser
  const products = await Product.find({ _id: { $in: [...wanted.keys()] } });
  if (products.length !== wanted.size) {
    return res.status(400).json({ message: 'A product in your cart is no longer sold. Please update your cart.' });
  }
  const orderItems = products.map((p) => ({ product: p._id, name: p.name, image: p.image, price: p.price, qty: wanted.get(String(p._id)) }));
  const subtotal = money(orderItems.reduce((sum, i) => sum + i.price * i.qty, 0));
  const shippingFee = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE;
  const order = new Order({ user: req.user._id, items: orderItems, shipping, subtotal, shippingFee, total: money(subtotal + shippingFee) });

  // Check the shipping form BEFORE touching the stock
  await order.validate();

  // Take each item out of stock. "stock >= qty" in the filter makes this safe
  // even if two people buy the last one at the same time: only one update matches.
  const taken = [];
  for (const item of orderItems) {
    const updated = await Product.findOneAndUpdate({ _id: item.product, stock: { $gte: item.qty } }, { $inc: { stock: -item.qty } });
    if (!updated) {
      await restoreStock(taken);
      const left = (await Product.findById(item.product))?.stock ?? 0;
      return res.status(409).json({ message: left ? `Only ${left} left of "${item.name}"` : `"${item.name}" is out of stock` });
    }
    taken.push(item);
  }

  try {
    await order.save();
  } catch (err) {
    await restoreStock(taken);
    throw err;
  }
  res.status(201).json(order);
});

router.get('/mine', async (req, res) => {
  res.json(await Order.find({ user: req.user._id }).sort({ createdAt: -1 }));
});

// Admin: every order, newest first, with the customer's name and email
router.get('/', requireAdmin, async (req, res) => {
  res.json(await Order.find().sort({ createdAt: -1 }).populate('user', 'name email'));
});

// Finds an order the current user is allowed to see (their own, or any for an admin)
async function findVisibleOrder(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ message: 'Invalid order id' });
    return null;
  }
  const order = await Order.findById(req.params.id);
  // Someone else's order answers 404, not 403, so ids of other orders stay secret
  if (!order || (!req.user.isAdmin && !order.user.equals(req.user._id))) {
    res.status(404).json({ message: 'Order not found' });
    return null;
  }
  return order;
}

router.get('/:id', async (req, res) => {
  const order = await findVisibleOrder(req, res);
  if (order) res.json(order);
});

// The customer can cancel their order while it hasn't been shipped
router.post('/:id/cancel', async (req, res) => {
  const order = await findVisibleOrder(req, res);
  if (!order) return;
  // Only change it if it's still pending (atomic, so it can't be cancelled twice)
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: 'pending' }, { status: 'cancelled' }, { returnDocument: 'after' });
  if (!updated) return res.status(409).json({ message: `This order is already ${order.status}, it can't be cancelled` });
  await restoreStock(updated.items);
  res.json(updated);
});

// Admin moves an order forward: pending -> shipped -> delivered (or cancels it)
const NEXT = { pending: ['shipped', 'cancelled'], shipped: ['delivered', 'cancelled'], delivered: [], cancelled: [] };

router.patch('/:id/status', requireAdmin, async (req, res) => {
  const order = await findVisibleOrder(req, res);
  if (!order) return;
  const { status } = req.body ?? {};
  if (!NEXT[order.status].includes(status)) {
    return res.status(400).json({ message: `An order that is ${order.status} can't become ${status}` });
  }
  const updated = await Order.findOneAndUpdate({ _id: order._id, status: order.status }, { status }, { returnDocument: 'after' });
  if (!updated) return res.status(409).json({ message: 'The order changed in the meantime, please refresh' });
  if (status === 'cancelled') await restoreStock(updated.items);
  res.json(updated);
});

module.exports = router;
module.exports.FREE_SHIPPING_FROM = FREE_SHIPPING_FROM;
module.exports.SHIPPING_FEE = SHIPPING_FEE;
