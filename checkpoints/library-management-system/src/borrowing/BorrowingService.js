// ===================== Borrowing subsystem =====================
// Handles borrowing and returning, keeps every BorrowTransaction,
// and asks the NotificationService to warn users about overdue books.

import BorrowTransaction from './BorrowTransaction.js';
import LibraryError from '../LibraryError.js';

export default class BorrowingService {
  #transactions = [];
  #notificationService;

  constructor(notificationService) {
    this.#notificationService = notificationService;
  }

  borrowBook(user, book, date = new Date()) {
    if (!book.isAvailable) {
      throw new LibraryError(`${book} is already borrowed by someone else.`);
    }
    if (!user.canBorrow()) {
      throw new LibraryError(
        `${user.name} has reached the limit of ${user.getMaxBooks()} books for a ${user.getRole()}.`
      );
    }

    book.markBorrowed();
    user.addBorrowedBook(book.isbn);

    const transaction = new BorrowTransaction(user, book, date);
    this.#transactions.push(transaction);
    return transaction;
  }

  returnBook(user, book, date = new Date()) {
    const transaction = this.#findOpenTransaction(user, book);
    if (!transaction) {
      throw new LibraryError(`${user.name} hasn't borrowed ${book}.`);
    }

    transaction.markReturned(date);
    book.markReturned();
    user.removeBorrowedBook(book.isbn);
    return transaction;
  }

  /** Books the user has right now (not returned yet) */
  getActiveTransactions(user) {
    return this.#transactions.filter((t) => t.user === user && !t.isReturned);
  }

  getAllTransactions() {
    return [...this.#transactions];
  }

  /**
   * Looks for overdue books and notifies the users through the Observer Pattern.
   * Each overdue loan is only notified once.
   * Returns the overdue transactions.
   */
  checkOverdue(today = new Date()) {
    const overdue = this.#transactions.filter((t) => t.isOverdue(today));

    for (const t of overdue) {
      if (t.overdueNotified) continue;
      const days = t.daysOverdue(today);
      // days is 0 when the loan was only flagged as overdue (simulation)
      const message =
        days > 0
          ? `${t.book} is overdue by ${days} day${days === 1 ? '' : 's'} ` +
            `(it was due on ${t.dueDate.toDateString()}). Please return it.`
          : `${t.book} has been marked as overdue. Please return it as soon as possible.`;
      if (this.#notificationService.notify(t.user, message)) {
        t.markOverdueNotified();
      }
    }
    return overdue;
  }

  clear() {
    this.#transactions = [];
  }

  #findOpenTransaction(user, book) {
    return this.#transactions.find((t) => t.user === user && t.book === book && !t.isReturned);
  }
}
