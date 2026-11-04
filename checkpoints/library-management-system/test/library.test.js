// Tests for the Library Management System. Run with: npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import LibrarySystem from '../src/LibrarySystem.js';
import LibraryError from '../src/LibraryError.js';
import User from '../src/users/User.js';
import Student from '../src/users/Student.js';
import Teacher from '../src/users/Teacher.js';
import UserFactory from '../src/users/UserFactory.js';

const library = LibrarySystem.getInstance();
const day = (d) => new Date(`2026-11-${String(d).padStart(2, '0')}`);

// Silence the "📩 To ..." logs from User.update during tests
console.log = () => {};

beforeEach(() => {
  library.reset();
  library.addUser('student', { id: 'S1', name: 'Amara' });
  library.addUser('teacher', { id: 'T1', name: 'Mrs. Bello' });
  ['A', 'B', 'C', 'D'].forEach((isbn) => library.addBook({ isbn, title: `Book ${isbn}`, author: 'X' }));
});

// ---------- Singleton ----------
test('Singleton: getInstance always returns the same library', () => {
  assert.equal(LibrarySystem.getInstance(), library);
});

test('Singleton: new LibrarySystem() is not allowed', () => {
  assert.throws(() => new LibrarySystem(), /Singleton/);
});

// ---------- Users, abstraction, Factory ----------
test('User is abstract and cannot be created directly', () => {
  assert.throws(() => new User('U1', 'Someone'), /abstract/);
});

test('Factory creates the right subclass', () => {
  const s = UserFactory.createUser('Student', { id: 'x', name: 'x' });
  const t = UserFactory.createUser('teacher', { id: 'y', name: 'y' });
  assert.ok(s instanceof Student && s instanceof User);
  assert.ok(t instanceof Teacher && t instanceof User);
  assert.equal(s.getMaxBooks(), 3);
  assert.equal(t.getLoanDays(), 30);
});

test('Factory rejects unknown types and can be extended with new ones', () => {
  assert.throws(() => UserFactory.createUser('librarian', { id: 'L1', name: 'L' }), LibraryError);

  class Librarian extends User {
    getRole() { return 'Librarian'; }
    getMaxBooks() { return 20; }
    getLoanDays() { return 60; }
  }
  UserFactory.registerType('librarian', Librarian);
  const user = library.addUser('librarian', { id: 'L1', name: 'Lib' });
  assert.equal(user.getRole(), 'Librarian');
});

test('duplicate user ids and ISBNs are rejected', () => {
  assert.throws(() => library.addUser('student', { id: 'S1', name: 'Again' }), LibraryError);
  assert.throws(() => library.addBook({ isbn: 'A', title: 'Again' }), LibraryError);
});

// ---------- Borrowing ----------
test('borrowing makes the book unavailable and shows in borrowed books', () => {
  library.borrowBook('S1', 'A', day(1));
  assert.equal(library.getBook('A').isAvailable, false);
  const borrowed = library.getBorrowedBooks('S1');
  assert.equal(borrowed.length, 1);
  assert.equal(borrowed[0].book.isbn, 'A');
  assert.equal(borrowed[0].dueDate.getTime(), day(15).getTime()); // 14 days for students
});

test('a borrowed book cannot be borrowed by someone else', () => {
  library.borrowBook('S1', 'A');
  assert.throws(() => library.borrowBook('T1', 'A'), /already borrowed/);
});

test('students are limited to 3 books', () => {
  ['A', 'B', 'C'].forEach((isbn) => library.borrowBook('S1', isbn));
  assert.throws(() => library.borrowBook('S1', 'D'), /limit of 3/);
});

test('returning a book makes it available again', () => {
  library.borrowBook('S1', 'A');
  library.returnBook('S1', 'A');
  assert.equal(library.getBook('A').isAvailable, true);
  assert.equal(library.getBorrowedBooks('S1').length, 0);
  library.borrowBook('T1', 'A'); // someone else can borrow it now
});

test("you can't return a book you didn't borrow", () => {
  assert.throws(() => library.returnBook('S1', 'A'), LibraryError);
});

test('unknown users and books give a clear error', () => {
  assert.throws(() => library.borrowBook('nobody', 'A'), /No user/);
  assert.throws(() => library.borrowBook('S1', 'ZZZ'), /No book/);
});

test('encapsulation: outside code cannot change the borrowed list', () => {
  library.borrowBook('S1', 'A');
  const user = library.getUser('S1');
  user.borrowedIsbns.push('B'); // changes only a copy
  assert.deepEqual(user.borrowedIsbns, ['A']);
});

// ---------- Overdue + Observer ----------
test('overdue books are found by date and the user is notified once', () => {
  library.borrowBook('S1', 'A', day(1)); // due 15th
  library.borrowBook('T1', 'B', day(1)); // due 1 Dec

  assert.equal(library.checkOverdueBooks(day(10)).length, 0);

  const overdue = library.checkOverdueBooks(day(20));
  assert.equal(overdue.length, 1);
  assert.equal(library.getUser('S1').notifications.length, 1);
  assert.match(library.getUser('S1').notifications[0], /overdue by 5 days/);
  assert.equal(library.getUser('T1').notifications.length, 0);

  library.checkOverdueBooks(day(21)); // checking again doesn't repeat the message
  assert.equal(library.getUser('S1').notifications.length, 1);
});

test('the overdue flag simulates an overdue book', () => {
  library.borrowBook('T1', 'B', day(1));
  library.simulateOverdue('T1', 'B');
  assert.equal(library.checkOverdueBooks(day(2)).length, 1);
  assert.match(library.getUser('T1').notifications[0], /marked as overdue/);
});

test('returned books are never overdue', () => {
  library.borrowBook('S1', 'A', day(1));
  library.returnBook('S1', 'A', day(3));
  assert.equal(library.checkOverdueBooks(day(30)).length, 0);
});

test('users who unsubscribe are not notified', () => {
  library.unsubscribeFromNotifications('S1');
  library.borrowBook('S1', 'A', day(1));
  library.checkOverdueBooks(day(20));
  assert.equal(library.getUser('S1').notifications.length, 0);

  library.subscribeToNotifications('S1'); // subscribing later still sends the pending warning
  library.checkOverdueBooks(day(20));
  assert.equal(library.getUser('S1').notifications.length, 1);
});
