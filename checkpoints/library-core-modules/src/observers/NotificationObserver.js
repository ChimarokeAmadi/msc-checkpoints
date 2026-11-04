// ===================== Observer Pattern: an observer =====================
// Listens for loan events and sends messages to members through whatever
// NotificationChannel it was given (console, email, memory for tests...).

import { EventPublisher, NotificationChannel } from '../interfaces/index.js';
import { LibraryEvents } from '../events/LibraryEvents.js';
import { formatDate } from '../utils/dates.js';

export class NotificationObserver {
  #channel;
  #unsubscribers = [];

  constructor({ eventBus, channel }) {
    EventPublisher.assert(eventBus, 'eventBus');
    this.#channel = NotificationChannel.assert(channel, 'channel');

    const on = (event, handler) => this.#unsubscribers.push(eventBus.subscribe(event, handler));

    on(LibraryEvents.BOOK_BORROWED, ({ member, book, loan }) =>
      this.#send(member, 'Book borrowed', `You borrowed ${book}. Please return it by ${formatDate(loan.dueDate)}.`)
    );
    on(LibraryEvents.LOAN_DUE_SOON, ({ member, book, loan, daysLeft }) =>
      this.#send(member, 'Due soon', `${book} is due in ${daysLeft} day(s), on ${formatDate(loan.dueDate)}.`)
    );
    on(LibraryEvents.LOAN_OVERDUE, ({ member, book, daysLate }) =>
      this.#send(member, 'Overdue', `${book} is ${daysLate} day(s) overdue. Please return it.`)
    );
    on(LibraryEvents.FINE_CHARGED, ({ member, book, amount, rule }) =>
      this.#send(member, 'Fine charged', `You were charged $${amount.toFixed(2)} for returning ${book} late (${rule}).`)
    );
  }

  #send(member, subject, body) {
    return this.#channel.send(member, subject, body);
  }

  /** Stop listening to all events */
  detach() {
    this.#unsubscribers.forEach((unsubscribe) => unsubscribe());
    this.#unsubscribers = [];
  }
}
