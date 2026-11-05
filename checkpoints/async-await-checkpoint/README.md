# Async/Await Checkpoint

The checkpoint asks for at least 3 tasks, and I did all 5. They're all in `async-await.js`. Each line of output starts with the time since the program started, like `[2.0s]`, so you can see the delays and which things happen at the same time.

## How to run it

You need Node.js 18 or newer.

```bash
node async-await.js      # runs all the tasks, one after another (about 12 seconds)
node async-await.js 4    # runs only task 4
```

Tasks 2 to 4 use a small fake API (`fakeApi`), which answers after 1 second like a real server would, so they work without internet. I can also make it fail on purpose to test error handling. Task 5 uses the real `fetch` on real URLs (JSONPlaceholder, a free test API), so it needs an internet connection.

## What each task does

**Task 01, iterating with async/await.** `iterateWithAsyncAwait(values)` goes through the array with a `for...of` loop and does `await delay(1000)` before logging each value, so they appear 1 second apart (at 1s, 2s and 3s). I used `for...of` and not `forEach`, because `forEach` doesn't wait for an async callback and would log everything at once after 1 second.

**Task 02, awaiting a call.** `awaitCall()` calls the fake API and uses `await` to pause until the answer arrives, then logs the user data. Without `await`, I'd only get a pending Promise instead of the data.

**Task 03, handling errors.** `awaitCallWithErrorHandling()` is the same call inside `try/catch/finally`. When the promise rejects, `await` throws the error and the `catch` block shows a friendly message ("Sorry, we couldn't load your data right now…"). The technical reason is still logged for the developer, and the function returns `null` instead of crashing. The demo shows a successful call, a server error (503) and a missing endpoint (404). `finally` runs in every case.

**Task 03, chaining async/await.** `chainedAsyncFunctions()` calls `stepOne`, `stepTwo` and `stepThree` one after the other with `await`. Each step waits 1 second, logs a message, and passes its result to the next step (login → profile → dashboard), so the whole chain takes about 3 seconds.

**Task 04, concurrent requests.** `concurrentRequests()` starts two API calls at the same time and waits for both with `Promise.all()`, then logs the combined result (the user's name and the weather). Both calls take 1 second, and the whole thing also takes about **1 second instead of 2**, because they run at the same time. If either request fails, `Promise.all` rejects and the error is caught.

**Task 05, parallel calls.** `parallelCalls(urls)` takes an array of URLs, starts a `fetch` for each one with `urls.map`, and waits for all of them with `Promise.all()`. It checks `response.ok` (fetch doesn't throw on a 404 by itself), turns each response into JSON, and logs them all once every request is complete.

## Sequential or concurrent?

The difference between Task 03 and Tasks 04/05 is the main idea of this checkpoint:

```js
// one after another: about 2 seconds
const a = await callA();
const b = await callB();

// at the same time: about 1 second
const [a, b] = await Promise.all([callA(), callB()]);
```

I'd use the sequential version when each step needs the result of the one before (like logging in before loading the profile), and `Promise.all` when the calls don't depend on each other. If I wanted to keep the successful results even when some calls fail, I could use `Promise.allSettled()` instead of `Promise.all()`.
