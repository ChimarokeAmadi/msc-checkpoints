// Downloads the two real GTFS feeds used in the benchmark and unzips them
// into data/raw/<name>/. Run: npm run data
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const FEEDS = {
  bigbluebus: 'https://gtfs.bigbluebus.com/current.zip', // Big Blue Bus, Santa Monica (CA)
  trimet: 'https://developer.trimet.org/schedule/gtfs.zip', // TriMet, Portland (OR)
};

(async () => {
  const dir = path.join(__dirname, '..', 'data', 'raw');
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, url] of Object.entries(FEEDS)) {
    process.stdout.write(`Downloading ${name}... `);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} answered ${res.status}`);
    const zip = path.join(dir, `${name}.zip`);
    fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
    execFileSync('unzip', ['-oq', zip, '-d', path.join(dir, name)]);
    console.log(`${(fs.statSync(zip).size / 1e6).toFixed(1)} MB`);
  }
  console.log('Note: transit agencies publish a new feed every few months, so the numbers will differ a little from my run.');
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
