// Loan, Fine and Reservation (DESIGN.md, class diagram and loan state diagram)

const DAY = 24 * 60 * 60 * 1000;
export const addDays = (date, days) => new Date(date.getTime() + days * DAY);
let nextId = 1;

export class Loan {
  #returnDate = null;
  #dueDate;
  #renewals = 0;

  constructor({ book, member, issueDate, loanDays }) {
    this.loanId = `L${nextId++}`;
    this.book = book;
    this.member = member;
    this.issueDate = issueDate;
    this.#dueDate = addDays(issueDate, loanDays);
  }

  get dueDate() { return this.#dueDate; }
  get returnDate() { return this.#returnDate; }
  get renewals() { return this.#renewals; }
  get isOpen() { return this.#returnDate === null; }

  /** Late if it's past the due date. Once returned, it's judged on the return date. */
  isOverdue(today) {
    return (this.#returnDate ?? today) > this.#dueDate;
  }

  daysLate(today) {
    if (!this.isOverdue(today)) return 0;
    return Math.ceil(((this.#returnDate ?? today) - this.#dueDate) / DAY);
  }

  renew(days, maxRenewals) {
    if (!this.isOpen) throw new Error('A closed loan cannot be renewed');
    if (this.#renewals >= maxRenewals) {
      throw new Error('This loan has already been renewed the maximum number of times');
    }
    this.#dueDate = addDays(this.#dueDate, days);
    this.#renewals++;
  }

  close(returnDate) {
    if (!this.isOpen) throw new Error('This loan is already closed');
    this.#returnDate = returnDate;
  }
}

export class Fine {
  #paid = false;

  constructor({ loan, amount, reason }) {
    if (amount <= 0) throw new Error('A fine must be more than 0');
    this.fineId = `F${nextId++}`;
    this.loan = loan;
    this.member = loan.member;
    this.amount = amount;
    this.reason = reason;
  }

  get paid() { return this.#paid; }
  pay() { this.#paid = true; }
}

export class Reservation {
  constructor({ book, member, reservedOn }) {
    this.reservationId = `R${nextId++}`;
    this.book = book;
    this.member = member;
    this.reservedOn = reservedOn;
    this.status = 'WAITING';
    this.holdUntil = null;
  }

  markReady(holdUntil) {
    this.status = 'READY';
    this.holdUntil = holdUntil;
  }

  fulfil() { this.status = 'FULFILLED'; }
  cancel() { this.status = 'CANCELLED'; }
}
