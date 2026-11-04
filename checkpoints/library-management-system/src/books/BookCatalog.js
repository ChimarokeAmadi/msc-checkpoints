// ===================== Book management subsystem =====================
// Stores the books and answers questions about them.

import Book from './Book.js';
import LibraryError from '../LibraryError.js';

export default class BookCatalog {
  #books = new Map(); // isbn -> Book

  addBook({ isbn, title, author, year } = {}) {
    if (this.#books.has(isbn)) {
      throw new LibraryError(`A book with ISBN "${isbn}" already exists.`);
    }
    const book = new Book(isbn, title, author, year);
    this.#books.set(book.isbn, book);
    return book;
  }

  getBook(isbn) {
    const book = this.#books.get(isbn);
    if (!book) throw new LibraryError(`No book with ISBN "${isbn}".`);
    return book;
  }

  getAllBooks() {
    return [...this.#books.values()];
  }

  getAvailableBooks() {
    return this.getAllBooks().filter((book) => book.isAvailable);
  }

  /** Simple search by title or author (not case sensitive) */
  search(text) {
    const q = text.toLowerCase();
    return this.getAllBooks().filter(
      (book) => book.title.toLowerCase().includes(q) || book.author.toLowerCase().includes(q)
    );
  }

  clear() {
    this.#books.clear();
  }
}
