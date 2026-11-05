# Refactoring Report: Shopping Cart System

## Where I started

The starting point is `v0-messy/cart.js`, a shopping cart in one file that works but is very hard to change. It adds products and customers, puts items in carts, checks stock, calculates a receipt with member discounts, a coupon, weight-based shipping and 19% tax, and sends an email or SMS when the price of a product someone is watching goes down.

Before changing anything, I listed the code smells I could find:

| Code smell | Where in v0 |
|---|---|
| **Cryptic names** | `p`, `u`, `c`, `t2`, `sh`, `pp`, `addP`, `add2cart`, `shipEst` |
| **Global mutable data** | `p`, `u`, `c` are global, and any function can change them |
| **Long method** | `checkout()` is about 70 lines and does everything: lookup, pricing, discounts, shipping, tax, printing, stock |
| **Duplication** | the "loop to find a product by name" is written 4 times, the shipping rules are copied in `checkout()` and `shipEst()`, and the email and SMS messages are built twice |
| **Magic numbers** | `0.1`, `0.15`, `10`, `50`, `100`, `4.5`, `8`, `1.5`, `0.19` with no explanation |
| **Dead code** | `checkoutOld()`, `tmp` and `DEBUG` are never used |
| **Long parameter list** | `addP(n, pr, cat, w, s)` and `newUser(n, t, e, ph, how, watch)`. It's easy to swap two arguments without noticing. |
| **Tight coupling** | pricing logic prints with `console.log` in the middle of the calculation, and `setPrice()` loops over every user and knows about email and SMS |
| **Switch on type** | `if (usr.t == 'student') … else if (usr.t == 'vip')`, `if (code == 'SAVE10')`, `if (how == 'email') … else if (how == 'sms')` |
| **Loose equality and `var`** | `==` everywhere, and `var i` is redeclared in the same function |

ESLint with the rules in `eslint.config.js` found **60 errors and 48 warnings** in v0.

## How I worked

I followed the hint: refactor in small steps and keep the code running. Before the first change I saved the output of the program as a "characterization test" (`test/expected-output.txt`). After every step, I ran the demo and compared its output with that file. `test/iterations.test.js` does this automatically for every version, so any change in behaviour shows up straight away. Each iteration is kept in its own folder so the history is easy to follow, and the top of each `cart.js` / `demo.js` explains what changed in that iteration.

## What changed in each iteration, and why

**Iteration 1: names, constants, extracted functions (`v1-clean-names-and-functions`).** Still one procedural file, but readable. I renamed every variable and function so the code explains itself (`t2` became `discountedTotal`). I moved the magic numbers into named constants and used *Extract Method* to break `checkout()` into `calculateSubtotal`, `calculateDiscount`, `calculateShipping`, `calculateTotals`, `printReceipt` and `reduceStock`. `checkout()` is now 12 lines that read like a list of steps. I replaced the four copies of the product search with `findProduct()`, kept the shipping rules only once, and deleted the dead code. I also changed `var` to `const`/`let` and `==` to `===`.

Removing the duplication uncovered a real bug. The copied shipping estimate (`shipEst`) used the price *before* discounts, so it told Amara her shipping was free (0.00) while checkout charged her 8.00. The two copies had drifted apart. Once both used the same `calculateShipping()`, the estimate became correct. This is the only line of output that changed in the whole refactoring, and the test checks that it's the only difference between v0 and v1.

**Iteration 2: modules and no global data (`v2-modules`).** I split the file into modules with one job each: `models` (Product, Customer), `catalog`, `cart`, `pricing`, `checkout`, `notifications`, plus `config.js` for all the settings and `money.js` for formatting. The global arrays became objects. A `Shop` owns its data, and each customer has their own `Cart`. The code that calculates now returns data, and printing happens in one place. For example, `formatReceipt()` returns a list of lines. Errors like "product not found" became error classes instead of a `console.log` in the middle of the logic. I also used dependency injection: `Shop`, `PriceCalculator` and `CheckoutService` receive their collaborators, including the output, so a test can capture what's printed.

**Iteration 3: Strategy for discounts (`v3-strategy`).** The `if/else` on member type and coupon code was replaced by strategy objects that all have the same method, `apply(amount, context)`: `PercentageDiscount`, `FixedAmountCoupon`, `CategoryDiscount`, `BulkDiscount` and `NoDiscount`. A `DiscountPolicy` picks which strategies apply to a customer and runs them in order. The `PriceCalculator` receives the policy and doesn't know any discount rules itself.

**Iteration 4: Observer for price drop notifications (`v4-observer`).** The function that looped over every customer and checked their channel was replaced. `PriceWatcher` is the subject, and `CustomerPriceAlert` objects subscribe to the products their customer is watching. When the `Catalog` changes a price, it only tells the `PriceWatcher`, and the watcher calls `update()` on the subscribers. Sending is done by `EmailChannel` or `SmsChannel`, so there's no `if` on the channel type anymore. Customers can now also start or stop watching at any time.

**Iteration 5: Builder for products (`v5-builder`).** `new Product('Laptop', 1200, 'electronics', 2.2, 5)` became `Product.builder('Laptop').price(1200).category('electronics').weight(2.2).stock(5).build()`. Products also got optional fields (SKU, brand, description, tags) that default sensibly. `build()` checks every field and lists *all* the problems in one error. Products are frozen, and price and stock are private, so they can only change through `changePrice()` and `reduceStock()`.

## How I followed clean code principles

- **Meaningful names:** every name says what it is (`calculateShipping`, `discountedTotal`, `preferredChannel`).
- **Small functions that do one thing:** the 70-line `checkout()` became a handful of short functions and classes. ESLint's `max-lines-per-function`, `complexity` and `max-depth` rules pass for the final version.
- **DRY (don't repeat yourself):** each rule lives in exactly one place. The shipping bug shows why this matters.
- **Single responsibility:** `Cart` only manages lines, `PriceCalculator` only prices, `CheckoutService` only checks out, and `receipt.js` only formats.
- **Open/closed:** new discounts, channels or observers are new classes, and the existing ones don't need editing (see `v5-builder/extras.js`).
- **Encapsulation:** private fields (`#lines`, `#price`, `#stock`) and frozen objects protect the data.
- **No magic numbers:** all settings are in `config.js`.
- **Dependency injection and separation of I/O:** the logic doesn't print. Output is passed in, which is why every part can be unit tested.
- **Tested and linted:** 15 tests (6 characterization tests and 9 unit tests). The final version has **0 ESLint errors and 0 warnings**, down from 60 errors and 48 warnings.

## How the patterns improved the design

- **Strategy** turned the discount `if/else` chain into separate, testable objects. A Black Friday sale (20% off electronics plus 5% off 10 or more items) is added in `extras.js` just by passing a different `DiscountPolicy`. `PriceCalculator` and `Cart` didn't change.
- **Observer** removed the coupling between changing a price and notifying people. The `Catalog` doesn't know customers exist. In `extras.js`, a price-history logger is added as a new observer with three lines and no changes to the other classes, and a customer unsubscribes with one call.
- **Builder** fixed the long parameter list (ESLint's `max-params` warning in v1–v4). The code that creates products is now self-explanatory. Optional fields didn't make the constructor longer, and invalid products can't be created.

All three patterns made the code longer in number of files. But each file is short, has one job, and can be changed or tested without touching the others, which was the goal of the refactoring.
