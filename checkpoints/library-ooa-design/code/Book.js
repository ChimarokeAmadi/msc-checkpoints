// Book: one physical copy. Its status follows the state diagram (DESIGN.md, section 6).

export const BookStatus = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  RESERVED: 'RESERVED',
  ISSUED: 'ISSUED',
  RETURNED: 'RETURNED',
  DAMAGED: 'DAMAGED',
  LOST: 'LOST',
  REMOVED: 'REMOVED',
});

// Straight from the state diagram: from -> the statuses it can go to
const ALLOWED = {
  AVAILABLE: ['ISSUED', 'RESERVED', 'REMOVED'],
  RESERVED: ['ISSUED', 'AVAILABLE'],
  ISSUED: ['RETURNED', 'LOST'],
  RETURNED: ['AVAILABLE', 'RESERVED', 'DAMAGED'],
  DAMAGED: ['AVAILABLE', 'REMOVED'],
  LOST: ['AVAILABLE', 'REMOVED'],
  REMOVED: [],
};

export class Book {
  #status = BookStatus.AVAILABLE; // private: only changes through the methods below

  constructor({ bookId, isbn, title, author, category, publishedYear }) {
    this.bookId = bookId;
    this.isbn = isbn;
    this.title = title;
    this.author = author;
    this.category = category;
    this.publishedYear = publishedYear;
  }

  get status() {
    return this.#status;
  }

  isAvailable() {
    return this.#status === BookStatus.AVAILABLE;
  }

  checkOut() { this.#moveTo(BookStatus.ISSUED); } // Available/Reserved -> Issued
  receive() { this.#moveTo(BookStatus.RETURNED); } // Issued -> Returned
  checkIn() { this.#moveTo(BookStatus.AVAILABLE); } // Returned/Reserved -> Available
  reserve() { this.#moveTo(BookStatus.RESERVED); } // Available/Returned -> Reserved
  markDamaged() { this.#moveTo(BookStatus.DAMAGED); } // Returned -> Damaged
  markLost() { this.#moveTo(BookStatus.LOST); } // Issued -> Lost
  repair() { this.#moveTo(BookStatus.AVAILABLE); } // Damaged -> Available
  remove() { this.#moveTo(BookStatus.REMOVED); } // Available/Damaged/Lost -> Removed

  #moveTo(next) {
    if (!ALLOWED[this.#status].includes(next)) {
      throw new Error(`"${this.title}": cannot go from ${this.#status} to ${next}`);
    }
    this.#status = next;
  }
}
