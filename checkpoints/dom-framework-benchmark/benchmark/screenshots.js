// Takes a screenshot of each app with a few tasks and one row being edited.
import puppeteer from 'puppeteer-core';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APPS, checkBuilt, findChrome } from './apps.js';
import { startServer } from './serve.js';

checkBuilt();
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'screenshots');
const server = await startServer(5197);
const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true });
try {
  for (const app of APPS) {
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    await page.setViewport({ width: 760, height: 560, deviceScaleFactor: 2 });
    await page.goto(`http://localhost:5197/${app.slug}/`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('main.app .add input');
    const examples = [['Finish the benchmark report', 'high'], ['Review pull request #42', 'medium'], ['Water the plants', 'low']];
    for (const [i, [name, prio]] of examples.entries()) {
      await page.type('.add input', name);
      await page.select('.add select', prio);
      await page.keyboard.press('Enter');
      await page.waitForFunction((n) => document.querySelectorAll('ul.tasks > li').length === n && !document.querySelector('.add input').value, {}, i + 1);
    }
    await page.click('ul.tasks li:nth-child(2) .edit');
    await page.waitForSelector('.edit-name');
    await page.evaluate(() => (document.getElementById('bench-result').textContent = ''));
    await page.screenshot({ path: join(out, `${app.slug}.png`) });
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}
console.log('Saved screenshots in', out);
