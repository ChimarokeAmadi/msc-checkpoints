// Demo: runs the main use cases with the classes from the design.
// Run it with: node demo.js

import { Book } from './Book.js';
import { Member, Librarian, MemberType } from './users.js';
import { LibraryRules } from './LibraryRules.js';
import {
  BookRepository, MemberRepository, LoanRepository, FineRepository, ReservationRepository,
} from './repositories.js';
import {
  CatalogService, FineService, ReservationService, LoanService, NotificationService, LoanError,
} from './services.js';

// ---------- Wire the layers together ----------
const rules = new LibraryRules();
const books = new BookRepository();
const members = new MemberRepository();
const loans = new LoanRepository();
const fines = new FineRepository();
const reservations = new ReservationRepository();

const notifier = new NotificationService();
const catalog = new CatalogService(books);
const fineService = new FineService(fines, rules);
const reservationService = new ReservationService(reservations, books, notifier);
const loanService = new LoanService({ books, members, loans, fineService, reservationService, notifier, rules });

const day = (d) => new Date(Date.UTC(2026, 10, d)); // November 2026
const step = (title) => console.log(`\n▶ ${title}`);
const show = (book) => console.log(`    "${book.title}" (${book.bookId}) is now ${book.status}`);
function attempt(action) {
  try {
    return action();
  } catch (error) {
    if (!(error instanceof LoanError) && !error.message.includes('cannot go from')) throw error;
    console.log(`    ❌ ${error.message}`);
    return null;
  }
}

// ---------- Data ----------
const librarian = new Librarian({ id: 'U0', name: 'Ms. Eze', email: 'eze@library.org', employeeId: 'E01' });
console.log(`Logged in as ${librarian.name} (${librarian.getRole()})`);

members.save(new Member({ id: 'M1', name: 'Amara', email: 'amara@mail.com', type: MemberType.STUDENT }));
members.save(new Member({ id: 'M2', name: 'David', email: 'david@mail.com', type: MemberType.STUDENT }));
members.save(new Member({ id: 'M3', name: 'Mrs. Bello', email: 'bello@mail.com', type: MemberType.TEACHER }));

catalog.addBook(new Book({ bookId: 'B1', isbn: '978-1593279509', title: 'Eloquent JavaScript', author: 'Marijn Haverbeke', category: 'Programming' }));
catalog.addBook(new Book({ bookId: 'B2', isbn: '978-1593279509', title: 'Eloquent JavaScript', author: 'Marijn Haverbeke', category: 'Programming' }));
catalog.addBook(new Book({ bookId: 'B3', isbn: '978-0201633610', title: 'Design Patterns', author: 'Erich Gamma', category: 'Programming' }));
catalog.addBook(new Book({ bookId: 'B4', isbn: '978-0132350884', title: 'Clean Code', author: 'Robert C. Martin', category: 'Programming' }));

// ---------- UC1 Search ----------
step('UC1 Search "javascript"');
catalog.search('javascript').forEach((r) =>
  console.log(`    ${r.title} by ${r.author}: ${r.available} of ${r.copies} available`)
);

// ---------- UC3 Issue ----------
step('UC3 Issue: Amara borrows Design Patterns on 1 Nov');
const loan1 = loanService.issueBook('M1', 'B3', day(1));
show(loan1.book);

step('UC3 Issue: David tries to borrow the same book');
attempt(() => loanService.issueBook('M2', 'B3', day(2)));

// ---------- UC5 Reserve ----------
step('UC5 Reserve: David reserves Design Patterns instead');
reservationService.reserve(members.findById('M2'), books.findById('B3'), day(2));
console.log('    David is on the waiting list');

// ---------- UC6 Renew ----------
step('UC6 Renew: Amara tries to renew it');
attempt(() => loanService.renewLoan(loan1.loanId));

// ---------- UC4 Return (late, reserved) ----------
step('UC4 Return: Amara returns it on 20 Nov (due 15 Nov)');
const { fine } = loanService.returnBook('B3', 'GOOD', day(20));
console.log(`    Fine: $${fine.amount.toFixed(2)} for ${loan1.daysLate(day(20))} days late`);
show(books.findById('B3'));

step('UC3 Issue: Mrs. Bello tries to take the book being held for David');
attempt(() => loanService.issueBook('M3', 'B3', day(20)));

step('UC3 Issue: David collects his reserved book');
loanService.issueBook('M2', 'B3', day(21));
show(books.findById('B3'));

// ---------- UC4 Return (damaged) ----------
step('UC4 Return: Mrs. Bello borrows Clean Code and returns it damaged');
loanService.issueBook('M3', 'B4', day(3));
loanService.returnBook('B4', 'DAMAGED', day(10));
show(books.findById('B4'));
attempt(() => loanService.issueBook('M1', 'B4', day(11)));

// ---------- State diagram: an illegal move ----------
step('State diagram: try to mark an available book as damaged');
attempt(() => books.findById('B1').markDamaged());

// ---------- UC13 Daily check ----------
step('UC13 Daily check: Amara borrows Eloquent JavaScript on 19 Nov (due 3 Dec)');
loanService.issueBook('M1', 'B1', day(19));
console.log('  Check on 1 Dec (2 days before it is due):');
loanService.runDailyCheck(new Date(Date.UTC(2026, 11, 1)));
console.log('  Check on 8 Dec:');
loanService.runDailyCheck(new Date(Date.UTC(2026, 11, 8)));

// ---------- UC8 Pay fine ----------
step('UC8 Pay fine');
console.log(`    Amara owes $${fineService.getUnpaidTotal('M1').toFixed(2)}`);
fineService.payFine(fine.fineId);
console.log(`    After paying: $${fineService.getUnpaidTotal('M1').toFixed(2)}`);
