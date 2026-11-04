# React to TypeScript Checkpoint

In this checkpoint I converted two small React components from JavaScript to TypeScript: a function component called Greeting and a class component called Counter. I set it up as a Vite project with the React + TypeScript template, so the converted components actually run in the browser and the TypeScript compiler checks them.

The original JavaScript code is saved in the `original-js` folder so it's easy to compare before and after. The converted files are in `src/components`, and each one has comments at the top listing the steps I took.

## Converting Greeting (Code 01)

First I renamed the file from `.jsx` to `.tsx`. The `.tsx` extension means the file is TypeScript but can still contain JSX. Then I wrote a type called `GreetingProps` that says the component takes a `name` and that it has to be a string, and I attached that type to the props with `({ name }: GreetingProps)`.

I also removed `import React from 'react'`. With the newer JSX transform you don't need to import React just to write JSX, and since this project's TypeScript settings don't allow unused imports, leaving it in would cause an error. After the change, if you write `<Greeting />` without a name, or pass a number like `name={42}`, TypeScript shows an error before the code even runs. I tested both cases to make sure.

## Converting Counter (Code 02)

For the class component I renamed it to `.tsx` too and wrote a type for its state, `CounterState`, which just says `count` is a number. Counter doesn't take any props, so its props type is an empty object. Class components take these two types in angle brackets, props first and state second: `Component<CounterProps, CounterState>`. After that, `this.state.count` is known to be a number and `setState` only accepts the right shape of state. I also typed the `increment` arrow function as returning `void` since it doesn't return anything.

While converting it I noticed a bug in the original code. The `return` keyword was alone on its line with the JSX starting on the next line. JavaScript automatically puts a semicolon after a lone `return`, so `render()` was actually returning nothing and the counter would never show up. I fixed it by putting the opening bracket on the same line as `return`.

## How to run it

You need Node.js installed. In this folder run:

```bash
npm install
npm run dev
```

Then open the link it prints (usually http://localhost:5173). You'll see the greeting and the counter, and clicking Increment goes up by one each time.

To check that everything type-checks and builds without errors, run `npm run build`.
