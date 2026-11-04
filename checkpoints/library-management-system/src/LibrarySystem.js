// ===================== LibrarySystem (Singleton Pattern) =====================
// The one central place the rest of the program talks to.
// Singleton: there can only ever be ONE LibrarySystem. You get it with
// LibrarySystem.getInstance(). Calling "new LibrarySystem()" yourself throws an error.
//
// It doesn't do the work itself. It passes each request to the right subsystem:
//   UserManager      -> user management
//   BookCatalog      -> book management
//   BorrowingService -> borrowing, returning and overdue checks
//   NotificationService -> sends the overdue messages (Observer Pattern)

import UserManager from './users/UserManager.js';
import BookCatalog from './books/BookCatalog.js';
import BorrowingService from './borrowing/BorrowingService.js';
import NotificationService from './borrowing/NotificationService.js';
import LibraryError from './LibraryError.js';

export default class LibrarySystem {
  static #instance = null;
  static #creating = false; // only true while getInstance() is building the instance

  #users;
  #books;
  #notifications;
  #borrowing;

  constructor() {
    if (!LibrarySystem.#creating) {
      throw new Error('LibrarySystem is a Singleton. Use LibrarySystem.getInstance() instead of new.');
    }
    this.#users = new UserManager();
    this.#books = new BookCatalog();
    this.#notifications = new NotificationService();
    this.#borrowing = new BorrowingService(this.#notifications);
  }

  static getInstance() {
    if (!LibrarySystem.#instance) {
      LibrarySystem.#creating = true;
      LibrarySystem.#instance = new LibrarySystem();
      LibrarySystem.#creating = false;
    }
    return LibrarySystem.#instance;
  }

  // ---------- Users ----------

  /**
   * Adds a user created by the UserFactory.
   * By default they're also subscribed to overdue notifications.
   */
  addUser(type, data, { notifications = true } = {}) {
    const user = this.#users.addUser(type, data);
    if (notifications) this.#notifications.subscribe(user);
    return user;
  }

  getUser(id) {
    return this.#users.getUser(id);
  }

  getAllUsers() {
    return this.#users.getAllUsers();
  }

  subscribeToNotifications(userId) {
    this.#notifications.subscribe(this.getUser(userId));
  }

  unsubscribeFromNotifications(userId) {
    this.#notifications.unsubscribe(this.getUser(userId));
  }

  // ---------- Books ----------

  addBook(data) {
    return this.#books.addBook(data);
  }

  getBook(isbn) {
    return this.#books.getBook(isbn);
  }

  getAllBooks() {
    return this.#books.getAllBooks();
  }

  getAvailableBooks() {
    return this.#books.getAvailableBooks();
  }

  searchBooks(text) {
    return this.#books.search(text);
  }

  // ---------- Borrowing ----------

  borrowBook(userId, isbn, date = new Date()) {
    return this.#borrowing.borrowBook(this.getUser(userId), this.getBook(isbn), date);
  }

  returnBook(userId, isbn, date = new Date()) {
    return this.#borrowing.returnBook(this.getUser(userId), this.getBook(isbn), date);
  }

  /** The books a user has borrowed and not returned yet, with their due dates */
  getBorrowedBooks(userId) {
    const user = this.getUser(userId);
    return this.#borrowing.getActiveTransactions(user).map((t) => ({
      book: t.book,
      borrowDate: t.borrowDate,
      dueDate: t.dueDate,
    }));
  }

  /** Simulation: mark a user's loan as overdue without waiting for the date */
  simulateOverdue(userId, isbn) {
    const user = this.getUser(userId);
    const transaction = this.#borrowing
      .getActiveTransactions(user)
      .find((t) => t.book.isbn === isbn);
    if (!transaction) throw new LibraryError(`${user.name} doesn't have the book with ISBN ${isbn}.`);
    transaction.setOverdueFlag(true);
  }

  /** Checks all loans and notifies the users with overdue books */
  checkOverdueBooks(today = new Date()) {
    return this.#borrowing.checkOverdue(today);
  }

  getAllTransactions() {
    return this.#borrowing.getAllTransactions();
  }

  /** Empties all the data (used to start the demo and the tests from a clean state) */
  reset() {
    this.#users.clear();
    this.#books.clear();
    this.#borrowing.clear();
    this.#notifications = new NotificationService();
    this.#borrowing = new BorrowingService(this.#notifications);
  }
}
