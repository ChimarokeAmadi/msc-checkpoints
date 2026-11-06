// Tests with Node's built-in test runner: node --test
// We pass a fake clock to the app so we can test any day and time.

const test = require('node:test');
const assert = require('node:assert');
const { createApp } = require('../app');
const { isWorkingTime, nextOpening } = require('../middleware/workingHours');

// November 2026: the 9th is a Monday, the 13th a Friday, the 14th a Saturday
const at = (day, hour, minute = 0) => new Date(2026, 10, day, hour, minute);

async function get(date, url, options) {
  const server = createApp({ now: () => date }).listen(0);
  const { port } = server.address();
  try {
    const res = await fetch(`http://localhost:${port}${url}`, options);
    return { status: res.status, body: await res.text() };
  } finally {
    server.close();
  }
}

test('working hours: Monday to Friday, 9:00 to 16:59', () => {
  assert.equal(isWorkingTime(at(9, 9, 0)), true); // Monday 9:00
  assert.equal(isWorkingTime(at(13, 16, 59)), true); // Friday 16:59
  assert.equal(isWorkingTime(at(9, 8, 59)), false); // too early
  assert.equal(isWorkingTime(at(11, 17, 0)), false); // 17:00 is closed
  assert.equal(isWorkingTime(at(14, 12, 0)), false); // Saturday
  assert.equal(isWorkingTime(at(15, 12, 0)), false); // Sunday
});

test('next opening time', () => {
  assert.deepEqual(nextOpening(at(10, 7, 30)), at(10, 9)); // Tuesday early -> same day
  assert.deepEqual(nextOpening(at(10, 18, 0)), at(11, 9)); // Tuesday evening -> Wednesday
  assert.deepEqual(nextOpening(at(13, 17, 0)), at(16, 9)); // Friday evening -> Monday
  assert.deepEqual(nextOpening(at(14, 10, 0)), at(16, 9)); // Saturday -> Monday
});

test('all three pages open during working hours, each with the nav bar', async () => {
  for (const [url, heading] of [['/', 'We build websites'], ['/services', 'Our Services'], ['/contact', 'Contact us']]) {
    const { status, body } = await get(at(11, 10), url);
    assert.equal(status, 200, url);
    assert.match(body, new RegExp(heading));
    assert.match(body, /href="\/"[^>]*>Home</);
    assert.match(body, /href="\/services"[^>]*>Our Services</);
    assert.match(body, /href="\/contact"[^>]*>Contact us</);
    assert.match(body, /\/css\/style\.css/);
  }
});

test('pages are closed outside working hours', async () => {
  for (const date of [at(14, 12), at(11, 20), at(11, 8)]) {
    const { status, body } = await get(date, '/services');
    assert.equal(status, 503);
    assert.match(body, /we're closed/);
    assert.doesNotMatch(body, /Website design/);
  }
});

test('the CSS still loads when closed, so the closed page is styled', async () => {
  const { status, body } = await get(at(14, 12), '/css/style.css');
  assert.equal(status, 200);
  assert.match(body, /\.nav-links/);
});

test('contact form: thanks for valid data, errors for bad data', async () => {
  const send = (data) =>
    get(at(11, 10), '/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(data),
    });

  const ok = await send({ name: 'Ada', email: 'ada@example.com', message: 'I need a new website.' });
  assert.equal(ok.status, 200);
  assert.match(ok.body, /Thank you, Ada!/);

  const bad = await send({ name: '', email: 'nope', message: 'hi' });
  assert.equal(bad.status, 400);
  assert.match(bad.body, /Please enter your name/);
  assert.match(bad.body, /valid email/);
});

test('unknown pages get a 404', async () => {
  const { status, body } = await get(at(11, 10), '/nothing-here');
  assert.equal(status, 404);
  assert.match(body, /Page not found/);
});
