// What the patterns make easy: new features WITHOUT editing the existing classes.
// Run with: node v5-builder/extras.js

import { Shop } from './src/Shop.js';
import { Product } from './src/models/Product.js';
import { PriceCalculator } from './src/pricing/PriceCalculator.js';
import { DiscountPolicy } from './src/pricing/discounts/DiscountPolicy.js';
import { CategoryDiscount, BulkDiscount } from './src/pricing/discounts/strategies.js';
import { formatMoney } from './src/money.js';

const title = (text) => console.log(`\n=== ${text} ===`);

// ---------- Strategy: a Black Friday sale is just a different policy ----------
title('Strategy: Black Friday shop (20% off electronics + 5% off 10+ items)');
const blackFriday = new DiscountPolicy({
  extraDiscounts: [new CategoryDiscount({ category: 'electronics', rate: 0.2 }), new BulkDiscount({ minItems: 10, rate: 0.05 })],
});
const shop = new Shop({ calculator: new PriceCalculator({ discountPolicy: blackFriday }) });

shop.addProduct(Product.builder('Headphones').price(89.9).category('electronics').weight(0.3).stock(10).build());
shop.addProduct(Product.builder('Notebook').price(3.5).category('stationery').weight(0.2).stock(100).build());
shop.addCustomer({ name: 'Amara', memberType: 'student', email: 'amara@mail.com', phone: '+216 20 111 111', preferredChannel: 'email', watchList: ['Headphones'] });
shop.addToCart('Amara', 'Headphones', 1);
shop.addToCart('Amara', 'Notebook', 10);
shop.checkout('Amara');

// ---------- Observer: a new observer, no change to PriceWatcher or Catalog ----------
title('Observer: add a price history logger and let Amara unsubscribe');
const history = [];
const priceHistoryLogger = {
  update: ({ product, oldPrice, newPrice }) => history.push(`${product.name}: ${oldPrice} -> ${newPrice}`),
};
shop.catalog.priceWatcher.subscribe('Headphones', priceHistoryLogger);
shop.changePrice('Headphones', 79.9); // Amara (email) + the logger

const stopWatching = shop.watch('Amara', 'Notebook');
shop.changePrice('Notebook', 3);
stopWatching();
shop.changePrice('Notebook', 2.5); // nobody is watching now: no message
console.log('Price history:', history);

// ---------- Builder: clear errors, optional fields with defaults ----------
title('Builder: validation and defaults');
try {
  Product.builder('Broken Chair').price(-5).weight(-1).stock(2.5).build();
} catch (error) {
  console.log(error.message);
}
const pen = Product.builder('Pen').price(1.2).build();
console.log(`Pen -> category: ${pen.category}, stock: ${pen.stock}, tags: [${pen.tags}], price: ${formatMoney(pen.price)}`);
try {
  pen.price = 0;
} catch {
  console.log('pen.price = 0 is refused: products can only change price through changePrice()');
}
