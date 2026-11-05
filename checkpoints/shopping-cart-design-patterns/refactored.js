// Part 2: The same shopping cart, refactored with the MODULE PATTERN
//
// The whole cart lives inside a function that runs once straight away (an IIFE).
// The variables inside it (items, CURRENCY, the helper functions) are private:
// code outside can't see or change them. The function returns an object with
// only the public operations, and that object is the one way to use the cart.
//
// Because the IIFE only runs once, there is exactly ONE cart, so the module
// also behaves like a Singleton.
//
// Inside, items are created by a small factory function (createItem), so
// every item is built and checked the same way.
//
// Run with: node refactored.js

const ShoppingCart = (function () {
  // ---------- Private state (hidden in the closure) ----------
  const items = [];
  const CURRENCY = 'TND';

  // ---------- Private helpers ----------

  // Factory: the only place where an item object is built and validated
  function createItem(name, quantity, price) {
    if (typeof name !== 'string' || name.trim() === '') {
      throw new Error('the item needs a name');
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error('the quantity must be a whole number greater than 0');
    }
    if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
      throw new Error('the price must be a number of 0 or more');
    }
    return { name: name.trim(), quantity, price };
  }

  function findIndex(name) {
    const wanted = String(name).toLowerCase();
    return items.findIndex((item) => item.name.toLowerCase() === wanted);
  }

  const money = (amount) => `${amount.toFixed(2)} ${CURRENCY}`;
  const lineTotal = (item) => item.quantity * item.price;

  // ---------- Public operations ----------

  function addItem(name, quantity, price) {
    let newItem;
    try {
      newItem = createItem(name, quantity, price);
    } catch (error) {
      console.log(`Error: ${error.message}.`);
      return false;
    }

    const index = findIndex(newItem.name);
    if (index !== -1) {
      items[index].quantity += newItem.quantity;
      items[index].price = newItem.price;
      console.log(`Updated ${items[index].name} (now x${items[index].quantity})`);
    } else {
      items.push(newItem);
      console.log(`Added ${newItem.name} (x${newItem.quantity})`);
    }
    return true;
  }

  function removeItem(name) {
    const index = findIndex(name);
    if (index === -1) {
      console.log(`${name} is not in the cart.`);
      return false;
    }
    items.splice(index, 1);
    console.log(`Removed ${name}`);
    return true;
  }

  function clearCart() {
    items.length = 0; // empties the same array, so nothing else is replaced
    console.log('The cart has been cleared.');
  }

  function getTotal() {
    return items.reduce((sum, item) => sum + lineTotal(item), 0);
  }

  function viewCart() {
    if (items.length === 0) {
      console.log('The cart is empty.');
      return;
    }
    items.forEach((item) => console.log(`${item.name} (x${item.quantity}) - ${money(lineTotal(item))}`));
    console.log(`Total: ${money(getTotal())}`);
  }

  /** A read-only copy of the items, so outside code can look but not change */
  function getItems() {
    return items.map((item) => Object.freeze({ ...item }));
  }

  // Only these are public. Object.freeze stops anyone replacing or adding methods.
  return Object.freeze({ addItem, removeItem, clearCart, viewCart, getTotal, getItems });
})();

// ---------- Example from the instructions ----------

console.log('> ShoppingCart.addItem("Apple", 2, 1.5)');
ShoppingCart.addItem('Apple', 2, 1.5);
console.log('> ShoppingCart.addItem("Orange", 3, 2.0)');
ShoppingCart.addItem('Orange', 3, 2.0);
console.log('> ShoppingCart.viewCart()');
ShoppingCart.viewCart();
console.log('> ShoppingCart.removeItem("Apple")');
ShoppingCart.removeItem('Apple');
console.log('> ShoppingCart.viewCart()');
ShoppingCart.viewCart();

// ---------- A few extra cases ----------

console.log('\n> ShoppingCart.addItem("Orange", 1, 2.0)   (same item again)');
ShoppingCart.addItem('Orange', 1, 2.0);
console.log('> ShoppingCart.addItem("Bread", 0, 1.2)    (bad quantity)');
ShoppingCart.addItem('Bread', 0, 1.2);
console.log('> ShoppingCart.removeItem("Banana")        (not in the cart)');
ShoppingCart.removeItem('Banana');

// ---------- The data is protected now ----------

console.log('\n> ShoppingCart.items');
console.log(ShoppingCart.items); // undefined: the array is private

console.log('> ShoppingCart.getItems()[0].quantity = -5   (try to change a copy)');
try {
  ShoppingCart.getItems()[0].quantity = -5;
} catch {
  // in strict mode this throws; either way the real cart isn't touched
}
console.log('> ShoppingCart.viewCart()');
ShoppingCart.viewCart(); // still correct

console.log('> ShoppingCart.addItem = null   (try to replace a method)');
ShoppingCart.addItem = null; // ignored, the module object is frozen
console.log('typeof ShoppingCart.addItem:', typeof ShoppingCart.addItem);

console.log('\n> ShoppingCart.clearCart()');
ShoppingCart.clearCart();
console.log('> ShoppingCart.viewCart()');
ShoppingCart.viewCart();
