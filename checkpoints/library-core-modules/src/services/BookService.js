// Book management. Every dependency is passed in (dependency injection)
// and checked against its interface.

import { Book } from '../models/Book.js';
import { Repository, EventPublisher, SearchStrategy } from '../interfaces/index.js';
import { LibraryEvents } from '../events/LibraryEvents.js';
import { searchStrategies } from '../strategies/search/index.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';
import { createSequentialIdGenerator } from '../utils/ids.js';

export class BookService {
  #books;
  #events;
  #nextId;

  constructor({ bookRepository, eventBus, idGenerator = createSequentialIdGenerator('book') }) {
    this.#books = Repository.assert(bookRepository, 'bookRepository');
    this.#events = EventPublisher.assert(eventBus, 'eventBus');
    this.#nextId = idGenerator;
  }

  addBook(data) {
    const book = new Book({ id: data.id ?? this.#nextId(), ...data });
    if (this.#books.findById(book.id)) throw new ValidationError(`A book with id "${book.id}" already exists`);
    this.#books.save(book);
    this.#events.publish(LibraryEvents.BOOK_ADDED, { book });
    return book;
  }

  getBook(id) {
    const book = this.#books.findById(id);
    if (!book) throw new NotFoundError('Book', id);
    return book;
  }

  /**
   * Strategy Pattern: the strategy decides what "matches" means.
   * Pass a name ("title", "author", "isbn", "genre", "keyword") or any
   * object with a matches(book, query) method.
   */
  search(query, strategy = 'keyword', { availableOnly = false } = {}) {
    const chosen = typeof strategy === 'string' ? searchStrategies[strategy] : strategy;
    if (!chosen) {
      throw new ValidationError(`Unknown search strategy "${strategy}". Try: ${Object.keys(searchStrategies).join(', ')}`);
    }
    SearchStrategy.assert(chosen, 'search strategy');
    return this.#books.findAll((book) => chosen.matches(book, query) && (!availableOnly || book.isAvailable));
  }

  listAvailable() {
    return this.#books.findAll((book) => book.isAvailable);
  }
}
