// Part 1: Shopping cart with PROCEDURAL programming
//
// - The cart data lives in a global variable.
// - Separate functions read and change that global variable.
//
// Run with: node procedural.js

// ---------- Global data ----------
var cart = []; // each item: { name, quantity, price }
var CURRENCY = 'TND';

// ---------- Functions ----------

function addItem(name, quantity, price) {
  if (typeof name !== 'string' || name.trim() === '') {
    console.log('Error: the item needs a name.');
    return;
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    console.log('Error: the quantity must be a whole number greater than 0.');
    return;
  }
  if (typeof price !== 'number' || price < 0) {
    console.log('Error: the price must be a number of 0 or more.');
    return;
  }

  // If the item is already in the cart, just increase its quantity
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].name.toLowerCase() === name.toLowerCase()) {
      cart[i].quantity += quantity;
      cart[i].price = price;
      console.log('Updated ' + cart[i].name + ' (now x' + cart[i].quantity + ')');
      return;
    }
  }

  cart.push({ name: name.trim(), quantity: quantity, price: price });
  console.log('Added ' + name + ' (x' + quantity + ')');
}

function getTotal() {
  var total = 0;
  for (var i = 0; i < cart.length; i++) {
    total += cart[i].quantity * cart[i].price;
  }
  return total;
}

function viewCart() {
  if (cart.length === 0) {
    console.log('The cart is empty.');
    return;
  }
  for (var i = 0; i < cart.length; i++) {
    var item = cart[i];
    var lineTotal = item.quantity * item.price;
    console.log(item.name + ' (x' + item.quantity + ') - ' + lineTotal.toFixed(2) + ' ' + CURRENCY);
  }
  console.log('Total: ' + getTotal().toFixed(2) + ' ' + CURRENCY);
}

function removeItem(name) {
  for (var i = 0; i < cart.length; i++) {
    if (cart[i].name.toLowerCase() === name.toLowerCase()) {
      cart.splice(i, 1);
      console.log('Removed ' + name);
      return;
    }
  }
  console.log(name + ' is not in the cart.');
}

function clearCart() {
  cart = [];
  console.log('The cart has been cleared.');
}

// ---------- Example from the instructions ----------

console.log('> addItem("Apple", 2, 1.5)');
addItem('Apple', 2, 1.5);
console.log('> addItem("Orange", 3, 2.0)');
addItem('Orange', 3, 2.0);
console.log('> viewCart()');
viewCart();
console.log('> removeItem("Apple")');
removeItem('Apple');
console.log('> viewCart()');
viewCart();

// ---------- A few extra cases ----------

console.log('\n> addItem("Orange", 1, 2.0)   (same item again)');
addItem('Orange', 1, 2.0);
console.log('> addItem("Bread", 0, 1.2)    (bad quantity)');
addItem('Bread', 0, 1.2);
console.log('> removeItem("Banana")        (not in the cart)');
removeItem('Banana');
console.log('> clearCart()');
clearCart();
console.log('> viewCart()');
viewCart();

// ---------- The weakness of this approach ----------
// "cart" is global, so any other code can change it directly and skip all the checks:
console.log('\n> cart.push({ name: "Ghost", quantity: -5, price: "free" })   (no function used!)');
cart.push({ name: 'Ghost', quantity: -5, price: 'free' });
console.log('> viewCart()');
viewCart(); // prints NaN, because the bad data never went through addItem()
