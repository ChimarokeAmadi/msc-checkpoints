// ITERATION 5 (final): Builder pattern for products.
//
// Changes from v4:
//   - Products are built with Product.builder(name).price(...).weight(...)...build()
//     instead of new Product(name, price, category, weight, stock).
//   - The builder gives every optional field a default (sku, brand, description, tags),
//     and build() validates all fields at once and lists every problem.
//   - Product is now immutable from outside: price and stock are private and only
//     change through changePrice() and reduceStock().
//   Same output as before.
//
// The full history of the iterations is in REPORT.md and in the header of each
// version's demo.js / cart.js. extras.js shows what the patterns make easy to add.
//
// Run with: node v5-builder/demo.js

import { Shop } from './src/Shop.js';
import { Product } from './src/models/Product.js';

const shop = new Shop();

shop.addProduct(
  Product.builder('Laptop').price(1200).category('electronics').weight(2.2).stock(5)
    .sku('LAP-001').brand('Lenovo').tags('computers', 'work').build()
);
shop.addProduct(
  Product.builder('Headphones').price(89.9).category('electronics').weight(0.3).stock(10)
    .sku('AUD-014').brand('Sony').description('Wireless, noise cancelling').build()
);
shop.addProduct(Product.builder('Notebook').price(3.5).category('stationery').weight(0.2).stock(100).build());
shop.addProduct(Product.builder('Coffee Mug').price(12).category('kitchen').weight(0.4).stock(20).build());

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
