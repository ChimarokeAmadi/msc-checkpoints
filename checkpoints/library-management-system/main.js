// Demo of the Library Management System. Run it with: node main.js
// It goes through every feature step by step and prints what happens.

import LibrarySystem from './src/LibrarySystem.js';
import LibraryError from './src/LibraryError.js';

const line = (title) => console.log(`\n========== ${title} ==========`);

// Tries an action and prints the error message if the library refuses it
function attempt(description, action) {
  try {
    action();
    console.log(`  ✅ ${description}`);
  } catch (error) {
    if (!(error instanceof LibraryError)) throw error; // real bugs should still crash
    console.log(`  ❌ ${description} -> ${error.message}`);
  }
}

function showBorrowed(library, userId) {
  const user = library.getUser(userId);
  const borrowed = library.getBorrowedBooks(userId);
  console.log(`  ${user.name} has ${borrowed.length} book(s):`);
  borrowed.forEach(({ book, dueDate }) =>
    console.log(`    - ${book} (due ${dueDate.toDateString()})`)
  );
}

// ---------- 1. Singleton ----------
line('1. Singleton: one LibrarySystem');
const library = LibrarySystem.getInstance();
const sameLibrary = LibrarySystem.getInstance();
console.log('  getInstance() returns the same object both times:', library === sameLibrary);
try {
  new LibrarySystem();
} catch (error) {
  console.log(`  new LibrarySystem() -> ${error.message}`);
}

// ---------- 2. Factory ----------
line('2. Factory: adding users');
library.addUser('student', { id: 'S1', name: 'Amara Okafor', email: 'amara@school.edu' });
library.addUser('student', { id: 'S2', name: 'David Mensah', email: 'david@school.edu' });
library.addUser('teacher', { id: 'T1', name: 'Mrs. Bello', email: 'bello@school.edu' });
// This one chose not to get notifications
library.addUser('teacher', { id: 'T2', name: 'Mr. Ade', email: 'ade@school.edu' }, { notifications: false });

library.getAllUsers().forEach((user) =>
  console.log(`  ${user} -> max ${user.getMaxBooks()} books for ${user.getLoanDays()} days`)
);
attempt('Add a user of type "admin"', () => library.addUser('admin', { id: 'A1', name: 'Nobody' }));

// ---------- 3. Books ----------
line('3. Adding books');
const books = [
  { isbn: '978-0-13-468599-1', title: 'The Pragmatic Programmer', author: 'Andrew Hunt', year: 1999 },
  { isbn: '978-0-596-51774-8', title: 'JavaScript: The Good Parts', author: 'Douglas Crockford', year: 2008 },
  { isbn: '978-0-201-63361-0', title: 'Design Patterns', author: 'Erich Gamma', year: 1994 },
  { isbn: '978-0-13-235088-4', title: 'Clean Code', author: 'Robert C. Martin', year: 2008 },
  { isbn: '978-1-59327-950-9', title: 'Eloquent JavaScript', author: 'Marijn Haverbeke', year: 2018 },
];
books.forEach((data) => library.addBook(data));
library.getAllBooks().forEach((book) => console.log(`  ${book}`));

// ---------- 4. Borrowing ----------
line('4. Borrowing books');
// Fixed dates so the output is the same every time
const nov1 = new Date('2026-11-01');

attempt('Amara borrows The Pragmatic Programmer', () => library.borrowBook('S1', '978-0-13-468599-1', nov1));
attempt('Amara borrows JavaScript: The Good Parts', () => library.borrowBook('S1', '978-0-596-51774-8', nov1));
attempt('Amara borrows Design Patterns', () => library.borrowBook('S1', '978-0-201-63361-0', nov1));
attempt('Amara borrows a 4th book (students can have 3)', () => library.borrowBook('S1', '978-0-13-235088-4', nov1));
attempt('David borrows The Pragmatic Programmer (Amara has it)', () => library.borrowBook('S2', '978-0-13-468599-1', nov1));
attempt('Mrs. Bello borrows Clean Code', () => library.borrowBook('T1', '978-0-13-235088-4', nov1));
attempt('Mr. Ade borrows Eloquent JavaScript', () => library.borrowBook('T2', '978-1-59327-950-9', nov1));

// ---------- 5. Viewing borrowed books ----------
line('5. Viewing borrowed books');
['S1', 'S2', 'T1', 'T2'].forEach((id) => showBorrowed(library, id));
console.log(`  Still available: ${library.getAvailableBooks().map((b) => b.title).join(', ') || 'none'}`);

// ---------- 6. Returning ----------
line('6. Returning books');
attempt('Amara returns Design Patterns', () => library.returnBook('S1', '978-0-201-63361-0', new Date('2026-11-05')));
attempt('David returns Clean Code (he never borrowed it)', () => library.returnBook('S2', '978-0-13-235088-4'));
attempt('David borrows Design Patterns now that it is back', () => library.borrowBook('S2', '978-0-201-63361-0', new Date('2026-11-05')));
showBorrowed(library, 'S1');

// ---------- 7. Overdue notifications (Observer) ----------
line('7. Overdue check on 20 Nov 2026');
// Students have 14 days, so Amara's books from 1 Nov were due on 15 Nov.
// Teachers have 30 days, so Mrs. Bello's book isn't due until 1 Dec.
let overdue = library.checkOverdueBooks(new Date('2026-11-20'));
console.log(`  ${overdue.length} overdue loan(s) found.`);

line('8. Simulating an overdue book with a flag');
// Mrs. Bello's book isn't late yet, so we force it with the flag
library.simulateOverdue('T1', '978-0-13-235088-4');
// Mr. Ade's is forced too, but he didn't subscribe, so he gets no message
library.simulateOverdue('T2', '978-1-59327-950-9');
overdue = library.checkOverdueBooks(new Date('2026-11-20'));
console.log(`  ${overdue.length} overdue loan(s) in total. Only the new ones were notified,`);
console.log("  and Mr. Ade isn't subscribed, so he got no message.");

line('9. Notifications each user received');
library.getAllUsers().forEach((user) =>
  console.log(`  ${user.name}: ${user.notifications.length} message(s)`)
);
