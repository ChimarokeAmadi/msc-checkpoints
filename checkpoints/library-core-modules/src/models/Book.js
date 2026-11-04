// Book: validates its own data and controls its own availability

import { requireString, optionalString, requireIsbn, requirePositiveInteger } from '../utils/validation.js';
import { RuleViolationError } from '../utils/errors.js';

export class Book {
  #available = true;

  constructor({ id, isbn, title, author, genre, year }) {
    this.id = requireString(id, 'book id');
    this.isbn = requireIsbn(isbn);
    this.title = requireString(title, 'title');
    this.author = optionalString(author, 'author', 'Unknown');
    this.genre = optionalString(genre, 'genre', 'General');
    this.year = year === undefined ? null : requirePositiveInteger(year, 'year');
  }

  get isAvailable() {
    return this.#available;
  }

  markBorrowed() {
    if (!this.#available) throw new RuleViolationError(`"${this.title}" is already on loan`);
    this.#available = false;
  }

  markReturned() {
    this.#available = true;
  }

  toString() {
    return `"${this.title}" by ${this.author}`;
  }
}
