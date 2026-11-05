// Unit tests for the final version (v5). Each part is tested on its own,
// which the v0 code made impossible (everything was global and printed directly).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { Product } from '../v5-builder/src/models/Product.js';
import { Customer } from '../v5-builder/src/models/Customer.js';
import { Cart } from '../v5-builder/src/cart/Cart.js';
import { Shop } from '../v5-builder/src/Shop.js';
import { PriceCalculator } from '../v5-builder/src/pricing/PriceCalculator.js';
import { DiscountPolicy } from '../v5-builder/src/pricing/discounts/DiscountPolicy.js';
import {
  PercentageDiscount, FixedAmountCoupon, CategoryDiscount, BulkDiscount, NoDiscount,
} from '../v5-builder/src/pricing/discounts/strategies.js';
import { calculateShipping } from '../v5-builder/src/pricing/shipping.js';
import { PriceWatcher } from '../v5-builder/src/notifications/PriceWatcher.js';
import { OutOfStockError } from '../v5-builder/src/errors.js';

const product = (name, price, extra = {}) =>
  Product.builder(name).price(price).category(extra.category ?? 'general').weight(extra.weight ?? 0.5).stock(extra.stock ?? 10).build();
const customer = (memberType = 'regular') =>
  new Customer({ name: 'Test', memberType, email: 't@x.com', phone: '1', preferredChannel: 'email' });
const captured = () => {
  const lines = [];
  return { lines, log: (line) => lines.push(line) };
};

// ---------- Builder ----------
test('Builder: chained calls, defaults and an immutable result', () => {
  const lamp = Product.builder('Lamp').price(25).tags('home', 'light').build();
  assert.equal(lamp.category, 'general');
  assert.equal(lamp.stock, 0);
  assert.deepEqual([...lamp.tags], ['home', 'light']);
  assert.throws(() => { lamp.price = 1; }, TypeError);
  assert.throws(() => { lamp.name = 'x'; }, TypeError);
});

test('Builder: build() lists every problem at once', () => {
  assert.throws(
    () => Product.builder('').price(-1).stock(1.5).build(),
    /name is required; price must be a number of 0 or more; stock must be a whole number/
  );
  assert.throws(() => Product.builder('No price').build(), /price must be/);
});

// ---------- Strategy ----------
test('Strategy: each discount on its own', () => {
  const cart = new Cart(customer());
  cart.add(product('TV', 100, { category: 'electronics' }), 1);
  cart.add(product('Pen', 1), 9);
  const ctx = { cart, customer: cart.customer };

  assert.equal(new PercentageDiscount(0.1).apply(200, ctx).discount, 20);
  assert.equal(new NoDiscount().apply(200, ctx).discount, 0);
  assert.equal(new CategoryDiscount({ category: 'electronics', rate: 0.2 }).apply(109, ctx).discount, 20);
  assert.equal(new BulkDiscount({ minItems: 10, rate: 0.5 }).apply(100, ctx).discount, 50);
  assert.equal(new BulkDiscount({ minItems: 11, rate: 0.5 }).apply(100, ctx).discount, 0);

  const coupon = new FixedAmountCoupon({ code: 'SAVE10', amount: 10, minimum: 50 });
  assert.deepEqual(coupon.apply(60), { discount: 10 });
  assert.match(coupon.apply(40).message, /needs 50.00/);
});

test('Strategy: the policy applies member discount, then extras, then the coupon', () => {
  const cart = new Cart(customer('vip'));
  cart.add(product('Chair', 100), 1);
  const policy = new DiscountPolicy({ extraDiscounts: [new PercentageDiscount(0.1)] });
  const { discount, discountedTotal } = policy.apply(100, cart, 'SAVE10');
  // 100 -15% = 85, -10% = 76.5, -10 coupon = 66.5
  assert.equal(discountedTotal, 66.5);
  assert.equal(discount, 33.5);
});

test('PriceCalculator: shipping and tax use the discounted total', () => {
  const cart = new Cart(customer('student'));
  cart.add(product('Desk', 120, { weight: 6 }), 1);
  const totals = new PriceCalculator().calculate(cart, '');
  assert.equal(totals.subtotal, 120);
  assert.equal(totals.discount, 12);
  assert.equal(totals.shipping, 0); // 108 >= 100
  assert.equal(Number(totals.tax.toFixed(2)), 20.52);
  assert.equal(calculateShipping(50, 6), 9.5); // 8 + 1 extra kg * 1.5
});

// ---------- Observer ----------
test('Observer: only price drops notify, and unsubscribe works', () => {
  const watcher = new PriceWatcher();
  const events = [];
  const unsubscribe = watcher.subscribe('Lamp', { update: (event) => events.push(event.newPrice) });
  const lamp = product('Lamp', 30);

  lamp.changePrice(35);
  watcher.priceChanged(lamp, 30); // increase: ignored
  lamp.changePrice(20);
  watcher.priceChanged(lamp, 35);
  unsubscribe();
  lamp.changePrice(10);
  watcher.priceChanged(lamp, 20);

  assert.deepEqual(events, [20]);
  assert.throws(() => watcher.subscribe('Lamp', {}), /update\(event\)/);
});

test('Shop: alerts go through each customer\'s channel', () => {
  const output = captured();
  const shop = new Shop({ output });
  shop.addProduct(product('Lamp', 30));
  shop.addCustomer({ name: 'A', memberType: 'regular', email: 'a@x.com', phone: '111', preferredChannel: 'sms', watchList: ['Lamp'] });
  shop.addCustomer({ name: 'B', memberType: 'regular', email: 'b@x.com', phone: '222', preferredChannel: 'email', watchList: [] });
  shop.watch('B', 'Lamp');
  shop.changePrice('Lamp', 25);
  assert.deepEqual(output.lines, [
    '[SMS to 111] Hi A, Lamp dropped from 30.00 to 25.00 TND!',
    '[EMAIL to b@x.com] Hi B, Lamp dropped from 30.00 to 25.00 TND!',
  ]);
});

// ---------- Cart and checkout ----------
test('Cart: stock is checked including what is already in the cart', () => {
  const cart = new Cart(customer());
  const lamp = product('Lamp', 30, { stock: 3 });
  cart.add(lamp, 2);
  assert.throws(() => cart.add(lamp, 2), OutOfStockError);
  cart.add(lamp, 1);
  assert.equal(cart.lines[0].quantity, 3);
});

test('Checkout reduces stock and empties the cart', () => {
  const output = captured();
  const shop = new Shop({ output });
  const lamp = shop.addProduct(product('Lamp', 30, { stock: 5 }));
  shop.addCustomer({ name: 'A', memberType: 'regular', email: 'a@x.com', phone: '1', preferredChannel: 'email' });
  shop.addToCart('A', 'Lamp', 2);
  const totals = shop.checkout('A');
  assert.equal(lamp.stock, 3);
  assert.equal(totals.subtotal, 60);
  assert.equal(shop.checkout('A'), null);
  assert.equal(output.lines.at(-1), 'Cart is empty');
  assert.throws(() => shop.addProduct({ name: 'fake' }), /use Product.builder/);
});
