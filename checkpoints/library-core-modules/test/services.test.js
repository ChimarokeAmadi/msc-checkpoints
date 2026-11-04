// These tests show why dependency injection helps: LoanService is given a
// fake clock, plain-object repositories and a spy event bus, so we can check
// exactly what it does without real time passing or a database.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LoanService, BookService, MemberFactory, Book,
  createFixedClock, createLibrary, createNotificationChannel,
  LibraryEvents, RuleViolationError, NotFoundError, InterfaceError, DailyFineStrategy,
} from '../src/index.js';

// A fake repository made from a plain object: no class needed, it just has the 4 methods
function fakeRepo(items = []) {
  const map = new Map(items.map((i) => [i.id, i]));
  return {
    findById: (id) => map.get(id) ?? null,
    findAll: (pred = () => true) => [...map.values()].filter(pred),
    save: (e) => (map.set(e.id, e), e),
    delete: (id) => map.delete(id),
  };
}

// A spy event bus that just records what was published
function spyBus() {
  const published = [];
  return { published, subscribe: () => () => {}, publish: (name, payload) => published.push({ name, payload }) };
}

function setup() {
  const clock = createFixedClock('2026-11-01T09:00:00Z');
  const factory = new MemberFactory();
  const student = factory.create('student', { id: 'm1', name: 'Amara', email: 'amara@x.com' });
  const guest = factory.create('guest', { id: 'm2', name: 'Tunde', email: 'tunde@x.com' });
  const books = ['b1', 'b2', 'b3', 'b4'].map((id) => new Book({ id, isbn: '9780132350884', title: `Book ${id}` }));
  const events = spyBus();
  const service = new LoanService({
    loanRepository: fakeRepo(),
    bookRepository: fakeRepo(books),
    memberRepository: fakeRepo([student, guest]),
    eventBus: events,
    clock,
  });
  return { clock, service, events, books };
}

test('LoanService refuses dependencies that do not fit their interface', () => {
  assert.throws(
    () => new LoanService({ loanRepository: {}, bookRepository: fakeRepo(), memberRepository: fakeRepo(), eventBus: spyBus(), clock: createFixedClock(0) }),
    (err) => err instanceof InterfaceError && /loanRepository must implement the Repository interface/.test(err.message)
  );
  assert.throws(
    () => new BookService({ bookRepository: fakeRepo(), eventBus: { publish() {} } }),
    /EventPublisher/
  );
});

test('borrowing sets the due date from the member policy and publishes an event', () => {
  const { service, events, books } = setup();
  const loan = service.borrow('m1', 'b1');
  assert.equal(loan.dueDate.toISOString(), '2026-11-15T09:00:00.000Z'); // students: 14 days
  assert.equal(books[0].isAvailable, false);
  assert.equal(events.published[0].name, LibraryEvents.BOOK_BORROWED);
});

test('borrowing rules: availability, limits, suspended members, unknown ids', () => {
  const { service } = setup();
  service.borrow('m2', 'b1');
  assert.throws(() => service.borrow('m1', 'b1'), /already on loan/);
  assert.throws(() => service.borrow('m2', 'b2'), /limit for a guest/);
  assert.throws(() => service.borrow('nobody', 'b2'), NotFoundError);
});

test('late return uses the member\'s FineStrategy and blocks borrowing until paid', () => {
  const { service, clock, events } = setup();
  const loan = service.borrow('m2', 'b1'); // guest: 7 days, $1/day
  clock.advanceDays(10);

  const { daysLate, fine } = service.returnBook(loan.id);
  assert.equal(daysLate, 3);
  assert.equal(fine, 3);
  assert.ok(events.published.some((e) => e.name === LibraryEvents.FINE_CHARGED && e.payload.amount === 3));

  assert.throws(() => service.borrow('m2', 'b2'), /unpaid fines of \$3.00/);
  service.payFine(loan.id);
  assert.ok(service.borrow('m2', 'b2'));
  assert.throws(() => service.returnBook(loan.id), /already returned/);
});

test('an injected fineStrategy replaces the per-member ones', () => {
  const clock = createFixedClock('2026-11-01T09:00:00Z');
  const factory = new MemberFactory();
  const member = factory.create('faculty', { id: 'f1', name: 'Prof', email: 'p@x.com' }); // normally no fines
  const book = new Book({ id: 'b9', isbn: '9780132350884', title: 'X' });
  const service = new LoanService({
    loanRepository: fakeRepo(), bookRepository: fakeRepo([book]), memberRepository: fakeRepo([member]),
    eventBus: spyBus(), clock, fineStrategy: new DailyFineStrategy({ ratePerDay: 2 }),
  });
  const loan = service.borrow('f1', 'b9');
  clock.advanceDays(32);
  assert.equal(service.returnBook(loan.id).fine, 4);
});

test('renewing: limits and overdue loans', () => {
  const { service, clock } = setup();
  const loan = service.borrow('m1', 'b1');
  service.renew(loan.id);
  assert.equal(loan.dueDate.toISOString(), '2026-11-29T09:00:00.000Z');
  assert.throws(() => service.renew(loan.id), RuleViolationError); // students: 1 renewal

  const loan2 = service.borrow('m1', 'b2');
  clock.advanceDays(20);
  assert.throws(() => service.renew(loan2.id), /Overdue loans cannot be renewed/);
  assert.throws(() => service.borrow('m1', 'b3'), /overdue book/);
});

test('checkLoans publishes due-soon and overdue events', () => {
  const { service, clock, events } = setup();
  service.borrow('m1', 'b1'); // due 15 Nov
  service.borrow('m2', 'b2'); // due 8 Nov
  clock.set('2026-11-07T09:00:00Z');
  assert.deepEqual(service.checkLoans(), { dueSoon: 1, overdue: 0 });
  clock.set('2026-11-10T09:00:00Z');
  assert.deepEqual(service.checkLoans(), { dueSoon: 0, overdue: 1 });
  const overdue = events.published.find((e) => e.name === LibraryEvents.LOAN_OVERDUE);
  assert.equal(overdue.payload.member.id, 'm2');
  assert.equal(overdue.payload.daysLate, 2);
});

test('createLibrary wires everything; observers react to real events', () => {
  const clock = createFixedClock('2026-11-01T09:00:00Z');
  const channel = createNotificationChannel('memory');
  const lib = createLibrary({ clock, channel });

  const m = lib.members.register('guest', { name: 'Tunde', email: 'tunde@x.com' });
  const b = lib.books.addBook({ isbn: '9780132350884', title: 'Clean Code' });
  const loan = lib.loans.borrow(m.id, b.id);
  clock.advanceDays(9);
  lib.loans.checkLoans();
  lib.loans.returnBook(loan.id);

  assert.deepEqual(channel.sent.map((s) => s.subject), ['Book borrowed', 'Overdue', 'Fine charged']);
  assert.equal(lib.observers.stats.totals.lateReturns, 1);
  assert.equal(lib.observers.stats.totals.finesCharged, 2);
  assert.deepEqual(
    lib.observers.audit.entries.map((e) => e.event),
    ['member.registered', 'book.added', 'loan.created', 'loan.overdue', 'loan.returned', 'fine.charged']
  );
  assert.throws(() => lib.members.register('guest', { name: 'Copy', email: 'TUNDE@x.com' }), /already registered/);
  assert.deepEqual(lib.books.search('clean', 'title').map((x) => x.title), ['Clean Code']);
  assert.throws(() => lib.books.search('x', 'magic'), /Unknown search strategy/);
});
