// Checks that the four apps work and behave the same: add, view, edit, cancel,
// delete, and the benchmark buttons. Run with: npm test
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { APPS, checkBuilt, findChrome } from './apps.js';
import { startServer } from './serve.js';

checkBuilt();
const PORT = 5199;
let server;
let browser;

before(async () => {
  server = await startServer(PORT);
  browser = await puppeteer.launch({ executablePath: findChrome(), headless: true });
});
after(async () => {
  await browser?.close();
  server?.close();
});

const rows = (page) =>
  page.$$eval('ul.tasks > li', (lis) =>
    lis.map((li) => ({
      priority: li.querySelector('.prio')?.textContent.trim(),
      name: li.querySelector('.name')?.textContent.trim(),
      editing: li.classList.contains('editing'),
    })),
  );

// Lets the framework finish updating the DOM before we read it.
const settle = (page) => page.evaluate(() => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0))));

async function type(page, selector, text) {
  await page.click(selector, { count: 3 });
  await page.keyboard.press('Backspace');
  await page.type(selector, text);
}

const firstRowsByApp = {};

for (const app of APPS) {
  describe(app.name, () => {
    let page;
    before(async () => {
      page = await browser.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.errors = errors;
      await page.goto(`http://localhost:${PORT}/${app.slug}/`, { waitUntil: 'networkidle0' });
      await page.waitForSelector('main.app');
    });
    after(() => page.close());

    test('starts empty', async () => {
      assert.match(await page.$eval('.empty', (e) => e.textContent), /No tasks yet/);
      assert.match(await page.$eval('.count', (e) => e.textContent), /^0 tasks$/);
    });

    test('ignores an empty task name', async () => {
      await page.click('.add button[type=submit]');
      await settle(page);
      assert.equal((await rows(page)).length, 0);
    });

    test('adds tasks with a priority', async () => {
      await type(page, '.add input', 'Buy milk');
      await page.select('.add select', 'high');
      await page.click('.add button[type=submit]');
      await type(page, '.add input', 'Call the bank');
      await page.select('.add select', 'low');
      await page.keyboard.press('Enter');
      await settle(page);
      assert.deepEqual(await rows(page), [
        { priority: 'high', name: 'Buy milk', editing: false },
        { priority: 'low', name: 'Call the bank', editing: false },
      ]);
      assert.equal(await page.$eval('.add input', (e) => e.value), '', 'the input is cleared after adding');
      assert.match(await page.$eval('.count', (e) => e.textContent), /^2 tasks$/);
      assert.ok(await page.$('ul.tasks li .prio.prio-high'), 'priority has its colour class');
    });

    test('edits the name and the priority', async () => {
      await page.click('ul.tasks li:first-child .edit');
      await page.waitForSelector('ul.tasks li.editing .edit-name');
      assert.equal(await page.$eval('.edit-name', (e) => e.value), 'Buy milk', 'the form starts with the current name');
      await type(page, '.edit-name', 'Buy oat milk');
      await page.select('.edit-priority', 'medium');
      await page.click('.save');
      await settle(page);
      assert.deepEqual((await rows(page))[0], { priority: 'medium', name: 'Buy oat milk', editing: false });
    });

    test('cancel keeps the task unchanged', async () => {
      await page.click('ul.tasks li:nth-child(2) .edit');
      await page.waitForSelector('.edit-name');
      await type(page, '.edit-name', 'Something else');
      await page.click('.cancel');
      await settle(page);
      assert.deepEqual((await rows(page))[1], { priority: 'low', name: 'Call the bank', editing: false });
    });

    test('deletes a task', async () => {
      await page.click('ul.tasks li:first-child .delete');
      await settle(page);
      assert.deepEqual((await rows(page)).map((r) => r.name), ['Call the bank']);
    });

    test('benchmark buttons: render, update 50, delete 50, clear', async () => {
      for (const n of [100, 500, 1000]) {
        await page.click(`#bench-${n}`);
        await settle(page);
        assert.equal((await rows(page)).length, n, `render ${n}`);
      }
      const all = await rows(page);
      firstRowsByApp[app.name] = all.slice(0, 5);

      await page.click('#bench-update');
      await settle(page);
      const updated = await rows(page);
      const changed = updated.filter((r, i) => r.name !== all[i].name || r.priority !== all[i].priority);
      assert.equal(changed.length, 50, 'exactly 50 rows changed');
      assert.ok(changed.every((r) => r.name.endsWith('(edited)')));

      await page.click('#bench-delete');
      await settle(page);
      assert.equal((await rows(page)).length, 950);

      await page.click('#bench-clear');
      await settle(page);
      assert.equal((await rows(page)).length, 0);
      assert.match(await page.$eval('#bench-result', (e) => e.textContent), /Clear: [\d.]+ ms/);
    });

    test('no errors in the console', () => {
      assert.deepEqual(page.errors, []);
    });
  });
}

test('the four frameworks render exactly the same tasks', () => {
  const [first, ...others] = Object.values(firstRowsByApp);
  for (const rowsOfApp of others) assert.deepEqual(rowsOfApp, first);
});
