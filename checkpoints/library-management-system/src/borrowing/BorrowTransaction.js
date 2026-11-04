// ===================== BorrowTransaction =====================
// A record of one user borrowing one book: when it was borrowed,
// when it's due, and when (if ever) it was returned.

const DAY_MS = 24 * 60 * 60 * 1000;

export default class BorrowTransaction {
  static #nextId = 1;

  #id;
  #user;
  #book;
  #borrowDate;
  #dueDate;
  #returnDate = null;
  #overdueFlag = false; // lets us simulate an overdue book without waiting
  #overdueNotified = false; // so the same user isn't warned twice

  constructor(user, book, borrowDate = new Date()) {
    this.#id = `T${BorrowTransaction.#nextId++}`;
    this.#user = user;
    this.#book = book;
    this.#borrowDate = new Date(borrowDate);
    // The loan length depends on the type of user (polymorphism)
    this.#dueDate = new Date(this.#borrowDate.getTime() + user.getLoanDays() * DAY_MS);
  }

  get id() {
    return this.#id;
  }

  get user() {
    return this.#user;
  }

  get book() {
    return this.#book;
  }

  get borrowDate() {
    return new Date(this.#borrowDate);
  }

  get dueDate() {
    return new Date(this.#dueDate);
  }

  get returnDate() {
    return this.#returnDate ? new Date(this.#returnDate) : null;
  }

  get isReturned() {
    return this.#returnDate !== null;
  }

  get overdueNotified() {
    return this.#overdueNotified;
  }

  markReturned(returnDate = new Date()) {
    this.#returnDate = new Date(returnDate);
  }

  /** Simulation helper: pretend this book is overdue */
  setOverdueFlag(value = true) {
    this.#overdueFlag = value;
  }

  markOverdueNotified() {
    this.#overdueNotified = true;
  }

  /** Overdue = not returned yet, and either the flag is set or the due date has passed */
  isOverdue(today = new Date()) {
    if (this.isReturned) return false;
    return this.#overdueFlag || new Date(today) > this.#dueDate;
  }

  daysOverdue(today = new Date()) {
    if (!this.isOverdue(today)) return 0;
    return Math.max(0, Math.ceil((new Date(today) - this.#dueDate) / DAY_MS));
  }
}
