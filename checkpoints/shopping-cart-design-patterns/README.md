# Shopping Cart: Procedural vs Design Pattern

In this checkpoint I built the same shopping cart twice in JavaScript. First with plain procedural code, then refactored with a design pattern, to see what difference the pattern makes. Both versions can add items (name, quantity and price), show the cart with the total in TND, remove an item by name, and clear the cart.

## The two versions

**[procedural.js](procedural.js)** is Part 1. The cart is a global array called `cart`, and there are separate functions (`addItem`, `viewCart`, `removeItem`, `clearCart`, `getTotal`) that read and change it. If you add an item that's already in the cart, its quantity goes up instead of the item being added twice. Bad input, like a quantity of 0, is refused with a message. At the end of the file I show the problem with this approach: because `cart` is global, other code can push an item directly with a negative quantity and the price "free", skipping all the checks, and the total becomes `NaN`.

**[refactored.js](refactored.js)** is Part 2, using the **Module pattern**. All the cart code is inside a function that runs once (an IIFE). The items array, the currency and the helper functions are private inside that closure, and the module returns one frozen object, `ShoppingCart`, with only the public methods. So every operation goes through `ShoppingCart.addItem(...)`, `ShoppingCart.viewCart()` and so on. Since the function only runs once, there's only ever one cart, which also makes it work like a Singleton. Inside the module, a small factory function, `createItem`, is the only place items are built and validated. At the end of the file I show that `ShoppingCart.items` is `undefined`, that changing a copy from `getItems()` doesn't affect the cart, and that `ShoppingCart.addItem` can't be replaced.

## How to run it

You need Node.js. In this folder run:

```bash
node procedural.js
node refactored.js
```

Both start with the example from the instructions and print the same result:

```
Apple (x2) - 3.00 TND
Orange (x3) - 6.00 TND
Total: 9.00 TND
```

After removing the Apple, they print `Orange (x3) - 6.00 TND` and `Total: 6.00 TND`.

## Reflection

My reflection report (what was hard, what the pattern improved, and when I'd use a pattern) is in [REFLECTION.md](REFLECTION.md).
