// A tiny static server for the four production builds:
// http://localhost:5100/react/, /angular/, /vue/, /svelte/
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';
import { APPS, checkBuilt } from './apps.js';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

export function startServer(port = 5100) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const [, slug, ...rest] = path.split('/');
    const app = APPS.find((a) => a.slug === slug);
    if (!app) {
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(APPS.map((a) => `<p><a href="/${a.slug}/">${a.name}</a></p>`).join(''));
      return;
    }
    const file = normalize(join(app.dist, rest.join('/') || 'index.html'));
    if (!file.startsWith(app.dist)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  checkBuilt();
  const port = Number(process.env.PORT) || 5100;
  await startServer(port);
  console.log(`Serving the four apps on http://localhost:${port}/`);
  for (const a of APPS) console.log(`  ${a.name.padEnd(8)} http://localhost:${port}/${a.slug}/`);
}
