// Async/Await checkpoint: all 5 tasks.
// Run everything:        node async-await.js
// Run only one task:     node async-await.js 4

// ---------- Helpers ----------

/** Returns a promise that resolves after `ms` milliseconds */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const start = Date.now();
/** Seconds since the program started, e.g. "[2.0s]", to show the delays and the concurrency */
const t = () => `[${((Date.now() - start) / 1000).toFixed(1)}s]`;

/**
 * A fake API: answers after `ms` milliseconds, or fails if `shouldFail` is true.
 * It behaves like a real network call (it returns a promise), without needing the internet.
 */
function fakeApi(endpoint, { ms = 1000, shouldFail = false } = {}) {
  const data = {
    '/users/1': { id: 1, name: 'Amara Okafor', email: 'amara@example.com' },
    '/users/1/posts': [
      { id: 101, title: 'Learning async/await' },
      { id: 102, title: 'Promises explained' },
    ],
    '/weather/tunis': { city: 'Tunis', temperature: 24, sky: 'sunny' },
  };

  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) reject(new Error(`503 Service Unavailable (${endpoint})`));
      else if (!(endpoint in data)) reject(new Error(`404 Not Found (${endpoint})`));
      else resolve(data[endpoint]);
    }, ms);
  });
}

// =====================================================================
// Task 01: Iterating with async/await
// =====================================================================
// A for...of loop with await inside waits for each delay before going on,
// so the values are logged one by one, 1 second apart.
// (forEach would NOT work here: it doesn't wait for async callbacks.)

async function iterateWithAsyncAwait(values) {
  for (const value of values) {
    await delay(1000);
    console.log(`${t()} ${value}`);
  }
}

// =====================================================================
// Task 02: Awaiting a call
// =====================================================================
// await pauses this function until the API promise resolves, then we have the data.

async function awaitCall() {
  console.log(`${t()} Fetching user...`);
  const user = await fakeApi('/users/1');
  console.log(`${t()} Received:`, user);
  return user;
}

// =====================================================================
// Task 03 (part 1): Handling errors with async/await
// =====================================================================
// Same as awaitCall, but wrapped in try/catch. If the promise rejects, await
// throws, and the catch block shows a friendly message instead of crashing.
// The technical error is still logged for the developer.

async function awaitCallWithErrorHandling(endpoint = '/users/1', options = {}) {
  try {
    console.log(`${t()} Fetching ${endpoint}...`);
    const data = await fakeApi(endpoint, options);
    console.log(`${t()} Received:`, data);
    return data;
  } catch (error) {
    console.log(`${t()} ⚠️  Sorry, we couldn't load your data right now. Please try again later.`);
    console.log(`         (details for the developer: ${error.message})`);
    return null; // the caller gets a clear "no data" instead of an exception
  } finally {
    console.log(`${t()} Request finished.`);
  }
}

// =====================================================================
// Task 03 (part 2): Chaining async/await
// =====================================================================
// Three async functions run one after another: each await waits for the
// previous step to finish, and each step can use the result of the one before.

async function stepOne() {
  await delay(1000);
  console.log(`${t()} Step 1: user logged in`);
  return { userId: 1 };
}

async function stepTwo(session) {
  await delay(1000);
  console.log(`${t()} Step 2: loaded profile for user ${session.userId}`);
  return { ...session, name: 'Amara' };
}

async function stepThree(profile) {
  await delay(1000);
  console.log(`${t()} Step 3: showing dashboard for ${profile.name}`);
  return 'dashboard ready';
}

async function chainedAsyncFunctions() {
  const session = await stepOne();
  const profile = await stepTwo(session);
  const result = await stepThree(profile);
  console.log(`${t()} All 3 steps done: ${result} (about 3 seconds, because they ran one after another)`);
}

// =====================================================================
// Task 04: Awaiting concurrent requests
// =====================================================================
// Both calls START at the same time, and Promise.all waits until both have finished.
// Two 1-second calls take about 1 second in total instead of 2.

async function concurrentRequests() {
  console.log(`${t()} Starting both requests at the same time...`);
  try {
    const [user, weather] = await Promise.all([fakeApi('/users/1'), fakeApi('/weather/tunis')]);
    console.log(`${t()} Both resolved. Combined result:`);
    console.log({ user: user.name, city: weather.city, temperature: `${weather.temperature}°C`, sky: weather.sky });
  } catch (error) {
    // Promise.all rejects as soon as ONE of the requests fails
    console.log(`${t()} ⚠️  One of the requests failed: ${error.message}`);
  }
}

// =====================================================================
// Task 05: Awaiting parallel calls
// =====================================================================
// fetch() every URL at once, then await them all together with Promise.all.
// Uses the real fetch API (built into Node 18+), so it needs an internet connection.

async function parallelCalls(urls) {
  console.log(`${t()} Fetching ${urls.length} URLs in parallel...`);
  try {
    const responses = await Promise.all(
      urls.map(async (url) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`${url} answered ${response.status} ${response.statusText}`);
        return response.json();
      })
    );
    console.log(`${t()} All ${responses.length} requests are complete:`);
    responses.forEach((data, i) => console.log(`  ${urls[i]}\n   ->`, summarise(data)));
    return responses;
  } catch (error) {
    console.log(`${t()} ⚠️  Could not load all the URLs: ${error.message}`);
    return null;
  }
}

/** Shows a short version of each response so the output stays readable */
function summarise(data) {
  if (Array.isArray(data)) return `array of ${data.length} items, first: ${JSON.stringify(data[0]).slice(0, 70)}...`;
  return JSON.stringify(data).slice(0, 100) + (JSON.stringify(data).length > 100 ? '...' : '');
}

// =====================================================================
// Run the tasks
// =====================================================================

const tasks = {
  1: ['Task 01: Iterating with async/await', () => iterateWithAsyncAwait(['apple', 'banana', 'cherry'])],
  2: ['Task 02: Awaiting a call', () => awaitCall()],
  3: [
    'Task 03: Handling errors + chaining',
    async () => {
      console.log('-- a call that succeeds --');
      await awaitCallWithErrorHandling('/users/1');
      console.log('-- a call that fails (server down) --');
      await awaitCallWithErrorHandling('/users/1', { shouldFail: true });
      console.log('-- a call to an endpoint that does not exist --');
      await awaitCallWithErrorHandling('/users/999');
      console.log('-- chaining three async functions --');
      await chainedAsyncFunctions();
    },
  ],
  4: ['Task 04: Awaiting concurrent requests', () => concurrentRequests()],
  5: [
    'Task 05: Awaiting parallel calls',
    () =>
      parallelCalls([
        'https://jsonplaceholder.typicode.com/posts/1',
        'https://jsonplaceholder.typicode.com/users/1',
        'https://jsonplaceholder.typicode.com/todos?_limit=3',
      ]),
  ],
};

async function main() {
  const chosen = process.argv[2] ? [process.argv[2]] : Object.keys(tasks);
  for (const key of chosen) {
    if (!tasks[key]) {
      console.log(`There is no task ${key}. Choose 1 to 5.`);
      continue;
    }
    const [title, run] = tasks[key];
    console.log(`\n========== ${title} ==========`);
    await run(); // tasks run one after another so their output doesn't mix
  }
}

main();
