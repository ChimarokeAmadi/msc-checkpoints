// Runs every step of the checkpoint in the real MongoDB shell (mongosh) against
// a real MongoDB server, saves the exact output to session.txt, and makes one
// terminal-style screenshot per step in screenshots/.
//
// Run with: npm start
// Needs mongosh installed (https://www.mongodb.com/try/download/shell).
// Set MONGOSH=/path/to/mongosh if it isn't on your PATH.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync, execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);
const { MongoMemoryServer } = require('mongodb-memory-server');

function findMongosh() {
  const candidates = [process.env.MONGOSH, 'mongosh', path.join(os.homedir(), 'bin', 'mongosh'), '/opt/homebrew/bin/mongosh', '/usr/local/bin/mongosh'];
  for (const c of candidates.filter(Boolean)) {
    try {
      execFileSync(c, ['--version'], { stdio: 'ignore' });
      return c;
    } catch {
      // try the next one
    }
  }
  throw new Error('mongosh not found. Install it, or set MONGOSH=/path/to/mongosh');
}

const NAME_HAS_AH = '{ age: { $gt: 18 }, $or: [{ first_name: /ah/i }, { last_name: /ah/i }] }';

// Each step = one screenshot. {ID} is replaced by Ben's real _id once it exists.
const STEPS = [
  { title: 'Create the "contact" database', db: 'test', cmds: ['use contact'] },
  { title: 'Create the "contactlist" collection', cmds: ['db.createCollection("contactlist")'] },
  {
    title: 'Insert the five contacts',
    cmds: [`db.contactlist.insertMany([
  { last_name: "Ben",    first_name: "Moris",      email: "ben@gmail.com",      age: 26 },
  { last_name: "Kefi",   first_name: "Seif",       email: "kefi@gmail.com",     age: 15 },
  { last_name: "Emilie", first_name: "brouge",     email: "emilie.b@gmail.com", age: 40 },
  { last_name: "Alex",   first_name: "brown",                                   age: 4 },
  { last_name: "Denzel", first_name: "Washington",                              age: 3 }
])`],
  },
  { title: 'Display all of the contacts list', cmds: ['db.contactlist.find()'] },
  { title: 'Display one person using his ID', cmds: ['db.contactlist.findOne({ _id: ObjectId("{ID}") })'] },
  { title: 'Display all the contacts with an age > 18', cmds: ['db.contactlist.find({ age: { $gt: 18 } })'] },
  {
    title: 'Contacts with age > 18 and a name containing "ah"',
    cmds: [`db.contactlist.find(${NAME_HAS_AH})`, `db.contactlist.countDocuments(${NAME_HAS_AH})`],
    note: 'No contact matches: none of the first or last names contain "ah", so find() returns nothing and the count is 0.',
  },
  {
    title: 'Change "Kefi Seif" to "Kefi Anis"',
    cmds: ['db.contactlist.updateOne(\n  { last_name: "Kefi", first_name: "Seif" },\n  { $set: { first_name: "Anis" } }\n)'],
  },
  { title: 'Delete the contacts aged under 5', cmds: ['db.contactlist.deleteMany({ age: { $lt: 5 } })'] },
  { title: 'Display all of the contacts list (final)', cmds: ['db.contactlist.find()'] },
];

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Light syntax colouring, a bit like the real mongosh
function colour(output) {
  return esc(output)
    .replace(/'([^'\n]*)'/g, '<span class="str">\'$1\'</span>') // strings, including ObjectId('...')
    .replace(/: (\d+)/g, ': <span class="num">$1</span>')
    .replace(/: (true|false)/g, ': <span class="bool">$1</span>');
}

function terminalHtml(step, index, transcript, dbName) {
  const body = transcript
    .map(({ cmd, out }) => {
      const lines = cmd.split('\n');
      const prompt = `<span class="prompt">${dbName}&gt;</span> `;
      const cont = '<span class="prompt">...</span> ';
      const typed = lines.map((l, i) => (i === 0 ? prompt : cont) + `<span class="cmd">${esc(l)}</span>`).join('\n');
      return `${typed}\n${out ? colour(out) + '\n' : ''}`;
    })
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body { margin: 0; background: #e2e8f0; padding: 24px; font-family: -apple-system, 'Segoe UI', sans-serif; }
    .win { width: 900px; border-radius: 10px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,.25); }
    .bar { background: #2d2f33; color: #c9ccd1; font-size: 13px; padding: 9px 12px; display: flex; align-items: center; gap: 8px; }
    .dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
    .bar .t { flex: 1; text-align: center; margin-right: 52px; }
    pre { margin: 0; background: #1b1d21; color: #e6e6e6; padding: 16px 18px; font: 14px/1.5 Menlo, 'SF Mono', monospace; white-space: pre-wrap; }
    .prompt { color: #4ade80; } .cmd { color: #ffffff; font-weight: 600; }
    .str { color: #fbbf24; } .num { color: #60a5fa; } .bool { color: #c084fc; }
    .cap { font-size: 15px; font-weight: 700; color: #0f172a; margin: 0 0 10px 2px; }
    .note { font-size: 13px; color: #334155; margin: 10px 0 0 2px; width: 900px; }
  </style></head><body>
    <p class="cap">Step ${index + 1}: ${esc(step.title)}</p>
    <div class="win">
      <div class="bar"><span class="dot" style="background:#ff5f57"></span><span class="dot" style="background:#febc2e"></span><span class="dot" style="background:#28c840"></span><span class="t">mongosh · contact</span></div>
      <pre>${body}</pre>
    </div>
    ${step.note ? `<p class="note">ℹ️ ${esc(step.note)}</p>` : ''}
  </body></html>`;
}

async function main() {
  const mongosh = findMongosh();
  console.log(`Using ${mongosh} (${execFileSync(mongosh, ['--version']).toString().trim()})`);
  console.log('Starting MongoDB...');
  const server = await MongoMemoryServer.create();
  const base = server.getUri().replace(/\/$/, '').replace(/\?.*$/, '');

  // Must be async: the in-memory MongoDB writes its logs through this Node
  // process, and a blocking execFileSync stops Node from reading them, so
  // MongoDB freezes once the log pipe is full.
  const run = async (db, cmd) => {
    const { stdout } = await execFileAsync(mongosh, [`${base}/${db}`, '--quiet', '--eval', cmd], { encoding: 'utf8' });
    return stdout.replace(/\s+$/, '');
  };

  let puppeteer;
  let browser;
  try {
    puppeteer = require('puppeteer');
    browser = await puppeteer.launch();
  } catch (e) {
    console.warn('puppeteer not available, skipping screenshots:', e.message);
  }

  const session = [];
  let benId = null;
  try {
    for (const [i, step] of STEPS.entries()) {
      const db = step.db || 'contact';
      const transcript = [];
      for (const raw of step.cmds) {
        const cmd = raw.replace('{ID}', benId);
        const out = await run(db, cmd);
        transcript.push({ cmd, out });
        session.push(`contact> ${cmd}\n${out}\n`);
      }
      // after the insert, look up Ben's real _id (like copying it from the screen)
      if (!benId && i >= 2) {
        benId = await run('contact','print(db.contactlist.findOne({ last_name: "Ben" })._id.toString())');
      }

      console.log(`\n── Step ${i + 1}: ${step.title}`);
      transcript.forEach(({ cmd, out }) => console.log(`contact> ${cmd}\n${out}`));

      if (browser) {
        const page = await browser.newPage();
        await page.setViewport({ width: 960, height: 400, deviceScaleFactor: 2 });
        await page.setContent(terminalHtml(step, i, transcript, 'contact'));
        const file = path.join(__dirname, 'screenshots', `${String(i + 1).padStart(2, '0')}-${step.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`);
        await page.screenshot({ path: file, fullPage: true });
        await page.close();
      }
    }
    fs.writeFileSync(path.join(__dirname, 'session.txt'), session.join('\n'));
    console.log('\nSaved session.txt' + (browser ? ' and screenshots/' : ''));
  } finally {
    if (browser) await browser.close();
    await server.stop();
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
