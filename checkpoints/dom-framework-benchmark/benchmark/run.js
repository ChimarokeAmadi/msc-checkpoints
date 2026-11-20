// Benchmarks the four apps in Chrome. Run with: npm run bench
//   RUNS=15 CPU=4 npm run bench   (CPU=4 slows the CPU down 4x, like a mid-range phone)
//
// For every measurement we load the app fresh, prepare the list, let the
// browser go quiet, clean up the memory, then click one benchmark button.
// We record two numbers:
//  - busy:  how long Chrome's main thread was actually working (JavaScript,
//           style, layout, paint), from Chrome DevTools' own counters
//           (Performance.getMetrics -> TaskDuration). This is the main result:
//           it's stable and doesn't include time spent waiting for the screen.
//  - paint: time from the click until the result is on screen. It's what a
//           user feels, but it jumps by ~16 ms depending on where in the
//           screen's refresh cycle (60 times a second) the click happened.
import { mkdir, writeFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { APPS, checkBuilt, findChrome } from './apps.js';
import { startServer } from './serve.js';

checkBuilt();
const RUNS = Number(process.env.RUNS) || 15;
const CPU = Number(process.env.CPU) || 1;
const PORT = 5198;
const here = dirname(fileURLToPath(import.meta.url));

// Each operation: what to prepare first (not timed), which button to time,
// and how many rows must be on the page afterwards.
const OPERATIONS = [
  { key: 'render100', label: 'Render 100 tasks', setup: [], click: '#bench-100', rows: 100 },
  { key: 'render500', label: 'Render 500 tasks', setup: [], click: '#bench-500', rows: 500 },
  { key: 'render1000', label: 'Render 1000 tasks', setup: [], click: '#bench-1000', rows: 1000 },
  { key: 'update50', label: 'Update 50 of 1000', setup: ['#bench-1000'], click: '#bench-update', rows: 1000 },
  { key: 'delete50', label: 'Delete 50 of 1000', setup: ['#bench-1000'], click: '#bench-delete', rows: 950 },
];

const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function metrics(cdp) {
  const { metrics: list } = await cdp.send('Performance.getMetrics');
  return Object.fromEntries(list.map((m) => [m.name, m.value]));
}

async function openApp(browser, app) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const cdp = await page.createCDPSession();
  await cdp.send('Performance.enable');
  await page.goto(`http://localhost:${PORT}/${app.slug}/`, { waitUntil: 'networkidle0' });
  await page.waitForSelector('#bench-1000');
  if (CPU > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  return { page, cdp };
}

async function quiet(page, cdp) {
  await settle(page);
  await cdp.send('HeapProfiler.collectGarbage');
  await pause(50);
  await settle(page);
}

async function measureOnce(browser, app, op) {
  const { page, cdp } = await openApp(browser, app);
  try {
    for (const selector of op.setup) {
      await page.click(selector);
      await settle(page);
    }
    await quiet(page, cdp);

    const before = await metrics(cdp);
    // Same timing code for every framework, run inside the page.
    const total = await page.evaluate(async (selector) => {
      const button = document.querySelector(selector);
      const start = performance.now();
      button.click();
      await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
      return performance.now() - start;
    }, op.click);
    const afterMetrics = await metrics(cdp);

    const rows = await page.$$eval('ul.tasks > li', (l) => l.length);
    if (rows !== op.rows) throw new Error(`${app.name} ${op.key}: expected ${op.rows} rows, got ${rows}`);

    return {
      total,
      style: (afterMetrics.RecalcStyleDuration - before.RecalcStyleDuration) * 1000,
      layout: (afterMetrics.LayoutDuration - before.LayoutDuration) * 1000,
      busy: (afterMetrics.TaskDuration - before.TaskDuration) * 1000,
    };
  } finally {
    await page.close();
  }
}

async function measureMemory(browser, app) {
  const { page, cdp } = await openApp(browser, app);
  try {
    await quiet(page, cdp);
    const empty = await metrics(cdp);
    await page.click('#bench-1000');
    await quiet(page, cdp);
    const full = await metrics(cdp);
    return {
      heapEmpty: empty.JSHeapUsedSize / 1024 / 1024,
      heap1000: full.JSHeapUsedSize / 1024 / 1024,
      domNodes1000: full.Nodes,
    };
  } finally {
    await page.close();
  }
}

function bundleSize(app) {
  let raw = 0;
  let gzip = 0;
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) walk(path);
      else if (path.endsWith('.js')) {
        const buf = readFileSync(path);
        raw += buf.length;
        gzip += gzipSync(buf, { level: 9 }).length;
      }
    }
  };
  walk(app.dist);
  return { jsKB: raw / 1024, jsGzipKB: gzip / 1024 };
}
function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const sd = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length);
  return { median, mean, sd, min: sorted[0], max: sorted.at(-1) };
}

const server = await startServer(PORT);
const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ['--js-flags=--expose-gc'],
});

const results = { date: new Date().toISOString(), runs: RUNS, cpuSlowdown: CPU, chrome: await browser.version(), frameworks: {} };
console.log(`${results.chrome}, ${RUNS} runs per operation, CPU slowdown ${CPU}x`);
console.log('Median main-thread busy time:\n');

try {
  // Warm up Chrome itself (first page load is always slower).
  await measureOnce(browser, APPS[0], OPERATIONS[0]);

  for (const app of APPS) results.frameworks[app.name] = { operations: {} };

  // Interleave the frameworks run by run, so a slow moment on the computer
  // doesn't land on only one of them.
  for (const op of OPERATIONS) {
    const samples = Object.fromEntries(APPS.map((a) => [a.name, []]));
    for (let run = 0; run < RUNS; run++) {
      for (const app of APPS) samples[app.name].push(await measureOnce(browser, app, op));
    }
    for (const app of APPS) {
      const list = samples[app.name];
      results.frameworks[app.name].operations[op.key] = {
        label: op.label,
        total: stats(list.map((s) => s.total)),
        style: stats(list.map((s) => s.style)),
        layout: stats(list.map((s) => s.layout)),
        busy: stats(list.map((s) => s.busy)),
        samples: list.map((s) => Number(s.total.toFixed(2))),
      };
    }
    console.log(
      op.label.padEnd(20),
      APPS.map((a) => `${a.name} ${results.frameworks[a.name].operations[op.key].busy.median.toFixed(1)}ms`).join('  '),
    );
  }

  for (const app of APPS) {
    const memory = [];
    for (let run = 0; run < 5; run++) memory.push(await measureMemory(browser, app));
    results.frameworks[app.name].memory = {
      heapEmptyMB: stats(memory.map((m) => m.heapEmpty)).median,
      heap1000MB: stats(memory.map((m) => m.heap1000)).median,
      domNodes1000: stats(memory.map((m) => m.domNodes1000)).median,
    };
    results.frameworks[app.name].bundle = bundleSize(app);
    const m = results.frameworks[app.name].memory;
    console.log(`${app.name.padEnd(8)} heap empty ${m.heapEmptyMB.toFixed(2)} MB, with 1000 tasks ${m.heap1000MB.toFixed(2)} MB, ${m.domNodes1000} DOM nodes`);
  }
} finally {
  await browser.close();
  server.close();
}

await mkdir(join(here, 'results'), { recursive: true });
const file = join(here, 'results', `results-cpu${CPU}x.json`);
await writeFile(file, JSON.stringify(results, null, 2) + '\n');
console.log(`\nSaved ${file}`);
