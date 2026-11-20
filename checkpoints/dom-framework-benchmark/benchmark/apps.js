import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Where each framework's production build ends up.
export const APPS = [
  { name: 'React', slug: 'react', dist: join(root, 'apps/react/dist') },
  { name: 'Angular', slug: 'angular', dist: join(root, 'apps/angular/dist/angular/browser') },
  { name: 'Vue', slug: 'vue', dist: join(root, 'apps/vue/dist') },
  { name: 'Svelte', slug: 'svelte', dist: join(root, 'apps/svelte/dist') },
];

export function checkBuilt() {
  const missing = APPS.filter((a) => !existsSync(join(a.dist, 'index.html')));
  if (missing.length) {
    console.error(`Build the apps first (npm run build). Missing: ${missing.map((a) => a.name).join(', ')}`);
    process.exit(1);
  }
}

// puppeteer-core doesn't download a browser, it uses the Chrome you have.
export function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    join(homedir(), 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'),
    join(homedir(), 'Desktop/Google Chrome.app/Contents/MacOS/Google Chrome'),
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) {
    console.error('Chrome not found. Set CHROME_PATH to your Chrome executable.');
    process.exit(1);
  }
  return found;
}
