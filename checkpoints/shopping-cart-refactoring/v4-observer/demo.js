// ITERATION 4: Observer pattern for price drop notifications.
//
// Changes from v3:
//   - notifications/priceAlerts.js (one function that knew every customer AND every channel) is gone.
//   - PriceWatcher is the subject: alerts subscribe to a product and get update(event) when its price drops.
//   - CustomerPriceAlert is the observer: it writes the message and sends it through a channel.
//   - EmailChannel and SmsChannel each know how to send, so there is no if/else on the channel type.
//   - The Catalog only tells the PriceWatcher that a price changed. It knows nothing about customers.
//   - Customers can now watch or stop watching a product at any time (shop.watch() returns an unsubscribe function).
//   Same output as before.
//
// --- Notes from the previous iterations ---
// ITERATION 3: Strategy pattern for discounts.
//
// Changes from v2:
//   - pricing/discount.js (an if/else on member types and coupon codes) is gone.
//   - Each discount is now a Strategy object with apply(amount, context):
//     PercentageDiscount, FixedAmountCoupon, CategoryDiscount, BulkDiscount, NoDiscount.
//   - DiscountPolicy picks the strategies for a customer and applies them in order.
//   - PriceCalculator receives the DiscountPolicy (dependency injection), so a sale can be
//     added by passing a different policy, with no change to the calculator.
//   Same output as before: the refactor did not change behaviour.
//
// --- Notes from the previous iteration ---
// ITERATION 2: split into modules, no more global data.
//
// Changes from v1:
//   - Each responsibility has its own module: models, catalog, cart, pricing, checkout, notifications.
//   - No global variables: the Shop object owns its data, and each customer has a Cart object.
//   - Dependency injection: Shop gets its catalog, calculator and output (console) passed in.
//   - Pure functions return data (formatReceipt returns lines) instead of printing,
//     so printing happens in one place.
//   - Errors are classes (ProductNotFoundError, OutOfStockError) instead of console.log in the middle of logic.
//   - All settings in config.js.
//   Still to improve: discounts are an if/else (v3), price alerts are tightly coupled (v4),
//   and products are created with 5 positional arguments (v5).
//
// Run with: node v4-observer/demo.js

import { Shop } from './src/Shop.js';

const shop = new Shop();

shop.addProduct('Laptop', 1200, 'electronics', 2.2, 5);
shop.addProduct('Headphones', 89.9, 'electronics', 0.3, 10);
shop.addProduct('Notebook', 3.5, 'stationery', 0.2, 100);
shop.addProduct('Coffee Mug', 12, 'kitchen', 0.4, 20);

shop.addCustomer({ name: 'Amara', memberType: 'student', email: 'amara@mail.com', phone: '+216 20 111 111', preferredChannel: 'email', watchList: ['Headphones'] });
shop.addCustomer({ name: 'Tunde', memberType: 'regular', email: 'tunde@mail.com', phone: '+216 20 222 222', preferredChannel: 'sms', watchList: ['Headphones', 'Laptop'] });
shop.addCustomer({ name: 'Bello', memberType: 'vip', email: 'bello@mail.com', phone: '+216 20 333 333', preferredChannel: 'email', watchList: ['Laptop'] });

shop.addToCart('Amara', 'Headphones', 1);
shop.addToCart('Amara', 'Notebook', 4);
shop.estimateShipping('Amara');
shop.checkout('Amara');

shop.addToCart('Tunde', 'Coffee Mug', 2);
shop.addToCart('Tunde', 'Notebook', 3);
shop.addToCart('Tunde', 'Laptop', 10);
shop.addToCart('Tunde', 'Phone', 1);
shop.checkout('Tunde', 'SAVE10');

shop.addToCart('Bello', 'Laptop', 1);
shop.addToCart('Bello', 'Coffee Mug', 1);
shop.checkout('Bello', 'SAVE10');
shop.checkout('Bello');

shop.changePrice('Headphones', 74.9);
shop.changePrice('Laptop', 1250);
shop.changePrice('Laptop', 1099);
