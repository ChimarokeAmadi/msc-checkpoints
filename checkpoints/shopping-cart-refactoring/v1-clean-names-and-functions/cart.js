// ITERATION 1: basic refactoring, still one file and still procedural.
//
// Changes from v0 (each one small, ran the demo after each):
//   1. Renamed everything: p -> products, c -> carts, addP -> addProduct, t2 -> discountedTotal, ...
//   2. Replaced magic numbers with named constants (TAX_RATE, FREE_SHIPPING_THRESHOLD, ...).
//   3. Extract Method: findProduct, findCustomer, findCartLine, calculateShipping,
//      calculateDiscount, printReceipt, reduceStock... checkout() went from 70 lines to 15.
//   4. Removed duplication: the 4 copies of "loop to find a product" are now findProduct(),
//      and the shipping rules exist once (calculateShipping) instead of twice.
//   5. Removed dead code: checkoutOld(), tmp and DEBUG were never used.
//   6. var -> const/let, == -> ===, semicolons, objects with readable property names.
//   7. BUG FIX found thanks to (4): the old shipping estimate was a copy that used the
//      price BEFORE discounts, so it said 0.00 for Amara while checkout charged 8.00.
//      Now both use the same function, so the estimate matches checkout.
//
// Run with: node v1-clean-names-and-functions/cart.js

// ---------- Constants (no more magic numbers) ----------
const CURRENCY = 'TND';
const TAX_RATE = 0.19;
const MEMBER_DISCOUNT_RATES = { student: 0.1, vip: 0.15, regular: 0 };
const COUPON_CODE = 'SAVE10';
const COUPON_AMOUNT = 10;
const COUPON_MINIMUM = 50;
const FREE_SHIPPING_THRESHOLD = 100;
const SHIPPING_LIGHT_MAX_KG = 1;
const SHIPPING_LIGHT_PRICE = 4.5;
const SHIPPING_STANDARD_MAX_KG = 5;
const SHIPPING_STANDARD_PRICE = 8;
const SHIPPING_PRICE_PER_EXTRA_KG = 1.5;

// ---------- Data (still global in this iteration, fixed in v2) ----------
const products = [];
const customers = [];
const carts = {};

const money = (amount) => amount.toFixed(2);

// ---------- Products and customers ----------

function addProduct(name, price, category, weightKg, stock) {
  products.push({ name, price, category, weightKg, stock });
}

function addCustomer(name, memberType, email, phone, preferredChannel, watchList) {
  customers.push({ name, memberType, email, phone, preferredChannel, watchList });
  carts[name] = [];
}

function findProduct(name) {
  return products.find((product) => product.name === name);
}

function findCustomer(name) {
  return customers.find((customer) => customer.name === name);
}

// ---------- Cart ----------

function findCartLine(cart, productName) {
  return cart.find((line) => line.productName === productName);
}

function addToCart(customerName, productName, quantity) {
  const product = findProduct(productName);
  if (!product) {
    console.log(`ERROR product not found ${productName}`);
    return;
  }

  const cart = carts[customerName];
  const line = findCartLine(cart, productName);
  const alreadyInCart = line ? line.quantity : 0;

  if (alreadyInCart + quantity > product.stock) {
    console.log(`Sorry ${customerName}, only ${product.stock} ${productName} left in stock`);
    return;
  }

  if (line) {
    line.quantity += quantity;
  } else {
    cart.push({ productName, quantity });
  }
}

// ---------- Pricing ----------

function calculateSubtotal(cart) {
  return cart.reduce((sum, line) => sum + findProduct(line.productName).price * line.quantity, 0);
}

function calculateWeight(cart) {
  return cart.reduce((sum, line) => sum + findProduct(line.productName).weightKg * line.quantity, 0);
}

/** Returns { discount, discountedTotal, messages } */
function calculateDiscount(subtotal, memberType, couponCode) {
  const messages = [];
  let discount = subtotal * (MEMBER_DISCOUNT_RATES[memberType] ?? 0);
  let discountedTotal = subtotal - discount;

  if (couponCode === COUPON_CODE) {
    if (discountedTotal >= COUPON_MINIMUM) {
      discount += COUPON_AMOUNT;
      discountedTotal -= COUPON_AMOUNT;
    } else {
      messages.push(`Coupon ${COUPON_CODE} needs ${money(COUPON_MINIMUM)} after member discount`);
    }
  }
  return { discount, discountedTotal, messages };
}

function calculateShipping(discountedTotal, weightKg) {
  if (discountedTotal >= FREE_SHIPPING_THRESHOLD) return 0;
  if (weightKg <= SHIPPING_LIGHT_MAX_KG) return SHIPPING_LIGHT_PRICE;
  if (weightKg <= SHIPPING_STANDARD_MAX_KG) return SHIPPING_STANDARD_PRICE;
  return SHIPPING_STANDARD_PRICE + (weightKg - SHIPPING_STANDARD_MAX_KG) * SHIPPING_PRICE_PER_EXTRA_KG;
}

function calculateTotals(cart, memberType, couponCode) {
  const subtotal = calculateSubtotal(cart);
  const { discount, discountedTotal, messages } = calculateDiscount(subtotal, memberType, couponCode);
  const shipping = calculateShipping(discountedTotal, calculateWeight(cart));
  const tax = discountedTotal * TAX_RATE;
  return { subtotal, discount, shipping, tax, total: discountedTotal + tax + shipping, messages };
}

function estimateShipping(customerName) {
  const customer = findCustomer(customerName);
  return calculateTotals(carts[customerName], customer.memberType, '').shipping;
}

// ---------- Checkout ----------

function printReceipt(customer, cart, totals) {
  console.log(`--- Receipt for ${customer.name} (${customer.memberType}) ---`);
  for (const line of cart) {
    const product = findProduct(line.productName);
    console.log(`${product.name} x${line.quantity} @ ${money(product.price)} = ${money(product.price * line.quantity)}`);
  }
  console.log(`Subtotal: ${money(totals.subtotal)}`);
  totals.messages.forEach((message) => console.log(message));
  if (totals.discount > 0) console.log(`Discount: -${money(totals.discount)}`);
  console.log(`Shipping: ${money(totals.shipping)}`);
  console.log(`Tax (${TAX_RATE * 100}%): ${money(totals.tax)}`);
  console.log(`Total: ${money(totals.total)} ${CURRENCY}`);
}

function reduceStock(cart) {
  for (const line of cart) {
    findProduct(line.productName).stock -= line.quantity;
  }
}

function checkout(customerName, couponCode) {
  const customer = findCustomer(customerName);
  const cart = carts[customerName];
  if (cart.length === 0) {
    console.log('Cart is empty');
    return;
  }

  const totals = calculateTotals(cart, customer.memberType, couponCode);
  printReceipt(customer, cart, totals);
  reduceStock(cart);
  carts[customerName] = [];
}

// ---------- Price changes ----------

function buildPriceDropMessage(customer, productName, oldPrice, newPrice) {
  return `Hi ${customer.name}, ${productName} dropped from ${money(oldPrice)} to ${money(newPrice)} ${CURRENCY}!`;
}

function notifyCustomer(customer, message) {
  if (customer.preferredChannel === 'email') {
    console.log(`[EMAIL to ${customer.email}] ${message}`);
  } else if (customer.preferredChannel === 'sms') {
    console.log(`[SMS to ${customer.phone}] ${message}`);
  }
}

function changePrice(productName, newPrice) {
  const product = findProduct(productName);
  const oldPrice = product.price;
  product.price = newPrice;

  if (newPrice >= oldPrice) return;

  customers
    .filter((customer) => customer.watchList.includes(productName))
    .forEach((customer) => notifyCustomer(customer, buildPriceDropMessage(customer, productName, oldPrice, newPrice)));
}

// ---------- Demo (same scenario as v0) ----------
addProduct('Laptop', 1200, 'electronics', 2.2, 5);
addProduct('Headphones', 89.9, 'electronics', 0.3, 10);
addProduct('Notebook', 3.5, 'stationery', 0.2, 100);
addProduct('Coffee Mug', 12, 'kitchen', 0.4, 20);

addCustomer('Amara', 'student', 'amara@mail.com', '+216 20 111 111', 'email', ['Headphones']);
addCustomer('Tunde', 'regular', 'tunde@mail.com', '+216 20 222 222', 'sms', ['Headphones', 'Laptop']);
addCustomer('Bello', 'vip', 'bello@mail.com', '+216 20 333 333', 'email', ['Laptop']);

addToCart('Amara', 'Headphones', 1);
addToCart('Amara', 'Notebook', 4);
console.log(`Estimated shipping for Amara: ${money(estimateShipping('Amara'))}`);
checkout('Amara', '');

addToCart('Tunde', 'Coffee Mug', 2);
addToCart('Tunde', 'Notebook', 3);
addToCart('Tunde', 'Laptop', 10);
addToCart('Tunde', 'Phone', 1);
checkout('Tunde', 'SAVE10');

addToCart('Bello', 'Laptop', 1);
addToCart('Bello', 'Coffee Mug', 1);
checkout('Bello', 'SAVE10');
checkout('Bello', '');

changePrice('Headphones', 74.9);
changePrice('Laptop', 1250);
changePrice('Laptop', 1099);
