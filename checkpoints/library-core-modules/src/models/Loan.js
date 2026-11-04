// Loan: one member borrowing one book

import { addDays, daysBetween } from '../utils/dates.js';
import { RuleViolationError } from '../utils/errors.js';

export class Loan {
  #dueDate;
  #returnedAt = null;
  #renewals = 0;
  #fine = 0;
  #finePaid = false;

  constructor({ id, bookId, memberId, borrowedAt, loanDays }) {
    this.id = id;
    this.bookId = bookId;
    this.memberId = memberId;
    this.borrowedAt = new Date(borrowedAt);
    this.#dueDate = addDays(this.borrowedAt, loanDays);
  }

  get dueDate() {
    return new Date(this.#dueDate);
  }

  get returnedAt() {
    return this.#returnedAt ? new Date(this.#returnedAt) : null;
  }

  get isOpen() {
    return this.#returnedAt === null;
  }

  get renewals() {
    return this.#renewals;
  }

  get fine() {
    return this.#fine;
  }

  get hasUnpaidFine() {
    return this.#fine > 0 && !this.#finePaid;
  }

  /** Days late as of `now` (or as of the return date, once returned) */
  daysLate(now) {
    return Math.max(0, daysBetween(this.#dueDate, this.#returnedAt ?? now));
  }

  isOverdue(now) {
    return this.isOpen && this.daysLate(now) > 0;
  }

  renew(days, maxRenewals) {
    if (!this.isOpen) throw new RuleViolationError('A returned loan cannot be renewed');
    if (this.#renewals >= maxRenewals) {
      throw new RuleViolationError(`This loan can be renewed at most ${maxRenewals} time(s)`);
    }
    this.#dueDate = addDays(this.#dueDate, days);
    this.#renewals++;
  }

  close(returnedAt, fine = 0) {
    if (!this.isOpen) throw new RuleViolationError('This loan was already returned');
    this.#returnedAt = new Date(returnedAt);
    this.#fine = fine;
  }

  payFine() {
    if (!this.hasUnpaidFine) throw new RuleViolationError('There is no unpaid fine on this loan');
    this.#finePaid = true;
  }
}
