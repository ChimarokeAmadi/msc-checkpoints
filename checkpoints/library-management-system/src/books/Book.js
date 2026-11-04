// ===================== Book =====================
// A single book in the library. Its availability can only be changed
// through markBorrowed() / markReturned(), not by setting a property.

import LibraryError from '../LibraryError.js';

export default class Book {
  #isbn;
  #title;
  #author;
  #year;
  #available = true;

  constructor(isbn, title, author, year) {
    if (!isbn || !title) {
      throw new TypeError('A book needs an ISBN and a title.');
    }
    this.#isbn = isbn;
    this.#title = title;
    this.#author = author ?? 'Unknown';
    this.#year = year ?? null;
  }

  get isbn() {
    return this.#isbn;
  }

  get title() {
    return this.#title;
  }

  get author() {
    return this.#author;
  }

  get year() {
    return this.#year;
  }

  get isAvailable() {
    return this.#available;
  }

  markBorrowed() {
    if (!this.#available) {
      throw new LibraryError(`"${this.#title}" is already borrowed.`);
    }
    this.#available = false;
  }

  markReturned() {
    this.#available = true;
  }

  toString() {
    return `"${this.#title}" by ${this.#author}${this.#year ? ` (${this.#year})` : ''}`;
  }
}
