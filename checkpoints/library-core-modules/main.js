// Demo of the library core. Run it with: node main.js
// It uses a fixed clock so we can jump forward in time and the output is always the same.

import {
  createLibrary,
  createFixedClock,
  createNotificationChannel,
  formatDate,
  LibraryError,
  TieredFineStrategy,
  anyOf,
  titleSearch,
  authorSearch,
} from './src/index.js';

const clock = createFixedClock('2026-11-01T10:00:00Z');
const library = createLibrary({ clock, channel: createNotificationChannel('console') });
const { books, members, loans, observers } = library;

const section = (title) => console.log(`\n=== ${title} (${formatDate(clock.now())}) ===`);
const attempt = (label, fn) => {
  try {
    const result = fn();
    console.log(`  ✅ ${label}`);
    return result;
  } catch (err) {
    if (!(err instanceof LibraryError)) throw err;
    console.log(`  ❌ ${label}: ${err.message}`);
    return null;
  }
};

// ---------- Factory ----------
section('Factory: registering members');
const amara = members.register('student', { name: 'Amara Okafor', email: 'amara@school.edu' });
const bello = members.register('faculty', { name: 'Dr. Bello', email: 'bello@school.edu' });
const tunde = members.register('guest', { name: 'Tunde', email: 'tunde@mail.com' });
for (const m of [amara, bello, tunde]) {
  const p = m.policy;
  console.log(`  ${m} -> ${p.maxLoans} book(s), ${p.loanDays} days, fines: ${p.fineStrategy.describe()}`);
}
attempt('Register a "robot" member', () => members.register('robot', { name: 'R2', email: 'r2@x.com' }));

// ---------- Books ----------
section('Adding books');
const eloquent = books.addBook({ isbn: '978-1593279509', title: 'Eloquent JavaScript', author: 'Marijn Haverbeke', genre: 'Programming', year: 2018 });
const clean = books.addBook({ isbn: '978-0132350884', title: 'Clean Code', author: 'Robert C. Martin', genre: 'Programming', year: 2008 });
const gof = books.addBook({ isbn: '978-0201633610', title: 'Design Patterns', author: 'Erich Gamma', genre: 'Programming', year: 1994 });
const things = books.addBook({ isbn: '978-0385474542', title: 'Things Fall Apart', author: 'Chinua Achebe', genre: 'Fiction', year: 1958 });
console.log(`  ${books.listAvailable().length} books added`);
attempt('Add a book with a bad ISBN', () => books.addBook({ isbn: '123', title: 'Bad' }));

// ---------- Strategy: search ----------
section('Strategy: searching');
const titles = (list) => list.map((b) => b.title).join(', ') || '(none)';
console.log(`  title "design"     -> ${titles(books.search('design', 'title'))}`);
console.log(`  author "achebe"    -> ${titles(books.search('achebe', 'author'))}`);
console.log(`  genre "fiction"    -> ${titles(books.search('fiction', 'genre'))}`);
console.log(`  keyword "martin"   -> ${titles(books.search('martin'))}`);
console.log(`  custom title|author "e" (first 2) -> ${titles(books.search('e', anyOf(titleSearch, authorSearch)).slice(0, 2))}`);

// ---------- Borrowing (Observer sends the emails) ----------
section('Borrowing');
const amaraLoan = attempt('Amara borrows Eloquent JavaScript', () => loans.borrow(amara.id, eloquent.id));
attempt('Tunde borrows Eloquent JavaScript too', () => loans.borrow(tunde.id, eloquent.id));
const tundeLoan = attempt('Tunde borrows Things Fall Apart', () => loans.borrow(tunde.id, things.id));
attempt('Tunde borrows a second book (guests get 1)', () => loans.borrow(tunde.id, clean.id));
const belloLoan = attempt('Dr. Bello borrows Design Patterns', () => loans.borrow(bello.id, gof.id));

// ---------- Time passes ----------
clock.advanceDays(5);
section('Daily check, 5 days later');
console.log('  summary:', loans.checkLoans());

clock.advanceDays(14);
section('Daily check, 19 days after borrowing');
console.log('  summary:', loans.checkLoans());
attempt('Amara renews her overdue book', () => loans.renew(amaraLoan.id));

// ---------- Returns: each member type uses a different fine strategy ----------
section('Returns: a different FineStrategy for each member type');
for (const loan of [amaraLoan, tundeLoan, belloLoan]) {
  const { daysLate, fine } = loans.returnBook(loan.id);
  const member = members.getMember(loan.memberId);
  console.log(`  -> ${member.name}: ${daysLate} day(s) late, fine $${fine.toFixed(2)}`);
}
attempt('Tunde borrows again with an unpaid fine', () => loans.borrow(tunde.id, clean.id));
attempt('Tunde pays his fine', () => loans.payFine(tundeLoan.id));
attempt('Tunde borrows Clean Code', () => loans.borrow(tunde.id, clean.id));

// ---------- Dependency injection: same code, different fine rule ----------
section('Dependency injection: a second library with a tiered fine for everyone');
const clock2 = createFixedClock('2026-11-01T10:00:00Z');
const strictLibrary = createLibrary({
  clock: clock2,
  channel: createNotificationChannel('memory'), // messages are stored, not printed
  fineStrategy: new TieredFineStrategy([
    { upToDay: 7, ratePerDay: 0.1 },
    { upToDay: Infinity, ratePerDay: 0.5 },
  ]),
});
const prof = strictLibrary.members.register('faculty', { name: 'Prof. Eze', email: 'eze@school.edu' });
const book = strictLibrary.books.addBook({ isbn: '978-1593279509', title: 'Eloquent JavaScript' });
const loan = strictLibrary.loans.borrow(prof.id, book.id);
clock2.advanceDays(40); // faculty get 30 days, so 10 days late
const result = strictLibrary.loans.returnBook(loan.id);
console.log(`  Prof. Eze is faculty (normally no fines), but this library injected a tiered rule:`);
console.log(`  ${result.daysLate} days late -> $${result.fine.toFixed(2)} (7 × $0.10 + 3 × $0.50)`);
console.log(`  Messages captured by the memory channel: ${strictLibrary.channel.sent.length}`);

// ---------- Observers: statistics and audit log ----------
section('Observers: statistics and audit log');
console.log('  totals:', observers.stats.totals);
console.log('  most borrowed:', observers.stats.mostBorrowed(2));
console.log(`  audit log has ${observers.audit.entries.length} entries, last 3:`);
observers.audit.entries.slice(-3).forEach((e) => console.log(`    ${formatDate(e.at)} ${e.event} member=${e.memberId} book=${e.bookId}`));
