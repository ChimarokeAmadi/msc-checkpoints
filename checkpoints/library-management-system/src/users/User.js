// ===================== User (abstract class) =====================
// Holds everything Students and Teachers have in common.
// JavaScript has no "abstract" keyword, so:
//   - the constructor refuses to create a plain User directly
//   - the methods each subclass MUST write throw an error if they're missing
//
// Users are also the OBSERVERS in the Observer Pattern: the
// NotificationService calls their update() method to notify them.

export default class User {
  // Private fields (#) = encapsulation. They can't be changed from outside,
  // only through the methods below.
  #id;
  #name;
  #email;
  #borrowedIsbns = new Set(); // ISBNs of the books this user currently has
  #notifications = []; // messages received from the NotificationService

  constructor(id, name, email) {
    if (new.target === User) {
      throw new TypeError('User is abstract. Create a Student or Teacher instead (use UserFactory).');
    }
    if (!id || !name) {
      throw new TypeError('A user needs an id and a name.');
    }
    this.#id = id;
    this.#name = name;
    this.#email = email ?? '';
  }

  // ---------- Abstract methods (each subclass must override them) ----------

  /** e.g. "Student" or "Teacher" */
  getRole() {
    throw new Error(`${this.constructor.name} must implement getRole()`);
  }

  /** How many books this user can have at the same time */
  getMaxBooks() {
    throw new Error(`${this.constructor.name} must implement getMaxBooks()`);
  }

  /** How many days this user can keep a book */
  getLoanDays() {
    throw new Error(`${this.constructor.name} must implement getLoanDays()`);
  }

  // ---------- Shared behaviour ----------

  get id() {
    return this.#id;
  }

  get name() {
    return this.#name;
  }

  get email() {
    return this.#email;
  }

  /** Copy of the borrowed ISBNs, so outside code can't change the real list */
  get borrowedIsbns() {
    return [...this.#borrowedIsbns];
  }

  canBorrow() {
    return this.#borrowedIsbns.size < this.getMaxBooks();
  }

  // Only the borrowing system should call these two
  addBorrowedBook(isbn) {
    this.#borrowedIsbns.add(isbn);
  }

  removeBorrowedBook(isbn) {
    this.#borrowedIsbns.delete(isbn);
  }

  // ---------- Observer Pattern ----------

  /** Called by the NotificationService (the "subject") */
  update(message) {
    this.#notifications.push(message);
    console.log(`  📩 To ${this.#name} (${this.getRole()}): ${message}`);
  }

  get notifications() {
    return [...this.#notifications];
  }

  toString() {
    return `${this.#name} [${this.getRole()}, id: ${this.#id}]`;
  }
}
