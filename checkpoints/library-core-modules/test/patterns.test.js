import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MemberFactory, Member, StudentMember, FacultyMember,
  createNotificationChannel, registerNotificationChannel,
  NoFineStrategy, DailyFineStrategy, TieredFineStrategy, GracePeriodFineStrategy,
  titleSearch, isbnSearch, keywordSearch, anyOf, authorSearch,
  EventBus, Book, ValidationError, createMemoryLogger,
} from '../src/index.js';

// ---------- Factory ----------
test('MemberFactory creates the right class for each type', () => {
  const factory = new MemberFactory();
  const s = factory.create('Student', { name: 'A', email: 'a@x.com' });
  const f = factory.create('faculty', { name: 'B', email: 'b@x.com' });
  assert.ok(s instanceof StudentMember && s instanceof Member);
  assert.ok(f instanceof FacultyMember);
  assert.equal(s.id, 'member-1');
  assert.equal(s.policy.maxLoans, 3);
  assert.throws(() => factory.create('alien', { name: 'C', email: 'c@x.com' }), ValidationError);
});

test('MemberFactory accepts policy overrides and new types', () => {
  class StaffMember extends Member {
    get type() { return 'staff'; }
    static defaultPolicy() { return { maxLoans: 5, loanDays: 21, fineStrategy: new NoFineStrategy() }; }
  }
  const factory = new MemberFactory({ policyOverrides: { student: { maxLoans: 6 } } }).register('staff', StaffMember);
  assert.equal(factory.create('student', { name: 'A', email: 'a@x.com' }).policy.maxLoans, 6);
  assert.equal(factory.create('staff', { name: 'B', email: 'b@x.com' }).policy.loanDays, 21);
  assert.throws(() => factory.register('bad', class {}), TypeError);
});

test('Member is abstract and policies must contain a real FineStrategy', () => {
  assert.throws(() => new Member({ id: '1', name: 'A', email: 'a@x.com' }), /abstract/);
  const factory = new MemberFactory({ policyOverrides: { guest: { fineStrategy: {} } } });
  assert.throws(() => factory.create('guest', { name: 'A', email: 'a@x.com' }), /FineStrategy/);
});

test('notification channel factory', () => {
  const memory = createNotificationChannel('memory');
  memory.send({ name: 'A', email: 'a@x.com' }, 'Hi', 'Body');
  assert.deepEqual(memory.sent, [{ to: 'a@x.com', subject: 'Hi', body: 'Body' }]);

  const mails = [];
  const email = createNotificationChannel('email', { transport: { sendMail: (m) => mails.push(m) } });
  email.send({ name: 'A', email: 'a@x.com' }, 'S', 'B');
  assert.equal(mails[0].to, 'a@x.com');
  assert.throws(() => createNotificationChannel('email'), /transport/);
  assert.throws(() => createNotificationChannel('pigeon'), ValidationError);

  registerNotificationChannel('sms', () => ({ send() {} }));
  assert.ok(createNotificationChannel('sms'));
  registerNotificationChannel('broken', () => ({}));
  assert.throws(() => createNotificationChannel('broken'), /NotificationChannel/);
});

// ---------- Strategy ----------
test('fine strategies', () => {
  assert.equal(new NoFineStrategy().calculate(30), 0);

  const daily = new DailyFineStrategy({ ratePerDay: 0.5, maxFine: 3 });
  assert.equal(daily.calculate(0), 0);
  assert.equal(daily.calculate(4), 2);
  assert.equal(daily.calculate(100), 3);

  const tiered = new TieredFineStrategy([{ upToDay: 7, ratePerDay: 0.1 }, { upToDay: Infinity, ratePerDay: 0.5 }]);
  assert.equal(tiered.calculate(3), 0.3);
  assert.equal(tiered.calculate(10), 2.2);
  assert.match(tiered.describe(), /days 1-7: \$0.10\/day, day 8\+: \$0.50\/day/);

  const grace = new GracePeriodFineStrategy({ graceDays: 2, inner: daily });
  assert.equal(grace.calculate(2), 0);
  assert.equal(grace.calculate(5), 1.5);
  assert.throws(() => new GracePeriodFineStrategy({ graceDays: 1, inner: {} }), /FineStrategy/);
});

test('search strategies', () => {
  const book = new Book({ id: 'b1', isbn: '978-0132350884', title: 'Clean Code', author: 'Robert C. Martin', genre: 'Programming' });
  assert.equal(titleSearch.matches(book, 'clean'), true);
  assert.equal(titleSearch.matches(book, 'martin'), false);
  assert.equal(isbnSearch.matches(book, '978-0-13-235088-4'), true);
  assert.equal(keywordSearch.matches(book, 'martin'), true);
  assert.equal(anyOf(titleSearch, authorSearch).matches(book, 'robert'), true);
  assert.throws(() => anyOf({ nope: true }), /SearchStrategy/);
});

// ---------- Observer ----------
test('EventBus: subscribe, wildcard, once and unsubscribe', () => {
  const bus = new EventBus();
  const got = [];
  const off = bus.subscribe('a', (p) => got.push(`a:${p.n}`));
  bus.subscribe('*', (p, name) => got.push(`*:${name}`));
  bus.once('a', () => got.push('once'));

  bus.publish('a', { n: 1 });
  bus.publish('a', { n: 2 });
  off();
  bus.publish('a', { n: 3 });

  assert.deepEqual(got, ['a:1', 'once', '*:a', 'a:2', '*:a', '*:a']);
});

test('EventBus: one failing observer does not stop the others', () => {
  const logger = createMemoryLogger();
  const bus = new EventBus({ logger });
  let reached = false;
  bus.subscribe('x', () => { throw new Error('boom'); });
  bus.subscribe('x', () => { reached = true; });
  bus.publish('x');
  assert.equal(reached, true);
  assert.ok(logger.lines.some((l) => l.includes('boom')));
});
