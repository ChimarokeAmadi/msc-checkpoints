# Shopping Cart Refactoring

In this checkpoint I took a messy shopping cart program and refactored it, one iteration at a time, into clean and modular code. Along the way I added the Strategy, Observer and Builder patterns. Every iteration is kept in its own folder, so you can see how the code changed step by step, and every one of them still runs.

| Folder | Iteration |
|---|---|
| `v0-messy/` | The original messy code |
| `v1-clean-names-and-functions/` | Renaming, constants, extracting functions, removing duplication and dead code |
| `v2-modules/` | Split into modules, no global data, dependency injection |
| `v3-strategy/` | Strategy pattern for discounts |
| `v4-observer/` | Observer pattern for price drop notifications |
| `v5-builder/` | Builder pattern for products (the final version) |

The full write-up (the code smells I found, what I changed in each iteration and why, the clean code principles, and how the patterns helped) is in **[REPORT.md](REPORT.md)**. Each version's `cart.js` or `demo.js` also starts with a comment listing what changed in that iteration.

## How to run it

You need Node.js 18 or newer.

```bash
npm install                        # only needed for ESLint
node v0-messy/cart.js              # the original
node v5-builder/demo.js            # the final version: same output
node v5-builder/extras.js          # new features the patterns made easy
npm test                           # 15 tests
npm run lint                       # ESLint on the final version and tests
npx eslint v0-messy                # see all the problems in the original
```

## How I checked I didn't break anything

Before refactoring, I saved the program's output in `test/expected-output.txt`. `test/iterations.test.js` runs every version and checks that it prints exactly that. The one difference is in v0. Its copied shipping estimate had a bug (it said 0.00 instead of 8.00), which I found and fixed in iteration 1, and the test checks that this is the only line that changed. `test/final-version.test.js` has unit tests for the builder, each discount strategy, the price watcher, the cart and checkout.
