// Observer that keeps simple statistics: loans, returns, most borrowed books, fines

import { EventPublisher } from '../interfaces/index.js';
import { LibraryEvents } from '../events/LibraryEvents.js';

export class StatisticsObserver {
  #borrowCounts = new Map(); // book title -> times borrowed
  #totals = { loans: 0, returns: 0, lateReturns: 0, finesCharged: 0, finesPaid: 0 };

  constructor({ eventBus }) {
    EventPublisher.assert(eventBus, 'eventBus');

    eventBus.subscribe(LibraryEvents.BOOK_BORROWED, ({ book }) => {
      this.#totals.loans++;
      this.#borrowCounts.set(book.title, (this.#borrowCounts.get(book.title) ?? 0) + 1);
    });
    eventBus.subscribe(LibraryEvents.BOOK_RETURNED, ({ daysLate }) => {
      this.#totals.returns++;
      if (daysLate > 0) this.#totals.lateReturns++;
    });
    eventBus.subscribe(LibraryEvents.FINE_CHARGED, ({ amount }) => {
      this.#totals.finesCharged += amount;
    });
    eventBus.subscribe(LibraryEvents.FINE_PAID, ({ amount }) => {
      this.#totals.finesPaid += amount;
    });
  }

  get totals() {
    return { ...this.#totals };
  }

  mostBorrowed(limit = 3) {
    return [...this.#borrowCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([title, count]) => ({ title, count }));
  }
}
