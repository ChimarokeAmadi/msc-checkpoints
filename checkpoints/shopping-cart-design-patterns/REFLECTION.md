# Reflection Report

## What challenges did I face during the refactor?

The first challenge was deciding what should be public and what should stay private. In the procedural version everything was global, so I never had to think about it. With the Module pattern I had to choose which functions other code really needs (add, remove, clear, view, total) and hide the rest, like the items array and the helper that finds an item. Another challenge was letting people see the items without letting them change the real array. My first idea was to return the array itself, but then anyone could still push bad data into it, so I return frozen copies instead. I also had to be careful with `clearCart()`. In the procedural version I replaced the array with a new one, but inside the closure I empty the same array with `items.length = 0`.

## How did using a design pattern improve the code?

The cart's data is now protected. In the procedural version, any line of code could write `cart.push(...)` and skip all the checks, and I showed this in the demo, where it printed "NaN TND". In the refactored version the only way in is through the module's methods, so every item is checked by the `createItem` factory. The global scope only has one name, `ShoppingCart`, instead of `cart`, `CURRENCY` and five functions, so nothing can clash with other scripts. There is also exactly one cart, like a Singleton.

## When would I choose a design pattern over procedural code?

For a tiny script that runs once, procedural code is quicker and easier to read. I would choose a pattern when the code will grow, when other people or other files will use it, or when the data must stay correct, for example a real shop where the cart is shared across many pages.
