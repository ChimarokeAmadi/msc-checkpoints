// Borrowing, returning, renewing, fines and the overdue check.
//
// Dependency injection: the repositories, the event bus, the clock and the id
// generator are all passed in. LoanService never creates them itself, so a test
// can pass a fixed clock and fake repositories and check exactly what happens.
//
// Strategy: the fine is calculated by the member's FineStrategy (or one injected
// for everybody with `fineStrategy`). LoanService doesn't know the fine rules.
//
// Observer: every important action is published on the event bus. LoanService
// doesn't know who listens (emails, audit log, statistics...).

import { Loan } from '../models/Loan.js';
import { Repository, EventPublisher, Clock, FineStrategy, Logger } from '../interfaces/index.js';
import { LibraryEvents } from '../events/LibraryEvents.js';
import { NotFoundError, RuleViolationError } from '../utils/errors.js';
import { createSequentialIdGenerator } from '../utils/ids.js';
import { daysBetween } from '../utils/dates.js';
import { silentLogger } from '../utils/logger.js';

export class LoanService {
  #loans;
  #books;
  #members;
  #events;
  #clock;
  #nextId;
  #fineStrategy;
  #logger;
  #dueSoonDays;

  constructor({
    loanRepository,
    bookRepository,
    memberRepository,
    eventBus,
    clock,
    idGenerator = createSequentialIdGenerator('loan'),
    fineStrategy = null, // optional: one strategy for everyone instead of per member type
    logger = silentLogger,
    dueSoonDays = 2,
  }) {
    this.#loans = Repository.assert(loanRepository, 'loanRepository');
    this.#books = Repository.assert(bookRepository, 'bookRepository');
    this.#members = Repository.assert(memberRepository, 'memberRepository');
    this.#events = EventPublisher.assert(eventBus, 'eventBus');
    this.#clock = Clock.assert(clock, 'clock');
    this.#nextId = idGenerator;
    this.#fineStrategy = fineStrategy && FineStrategy.assert(fineStrategy, 'fineStrategy');
    this.#logger = Logger.assert(logger, 'logger');
    this.#dueSoonDays = dueSoonDays;
  }

  borrow(memberId, bookId) {
    const member = this.#getMember(memberId);
    const book = this.#getBook(bookId);
    const now = this.#clock.now();

    if (!member.isActive) throw new RuleViolationError(`${member.name}'s membership is suspended`);
    if (this.unpaidFines(memberId) > 0) {
      throw new RuleViolationError(`${member.name} has unpaid fines of $${this.unpaidFines(memberId).toFixed(2)}`);
    }
    const active = this.activeLoans(memberId);
    if (active.length >= member.policy.maxLoans) {
      throw new RuleViolationError(`${member.name} already has ${active.length} book(s), the limit for a ${member.type}`);
    }
    if (active.some((l) => this.#isOverdue(l, now))) {
      throw new RuleViolationError(`${member.name} has an overdue book and must return it first`);
    }

    book.markBorrowed();
    const loan = new Loan({
      id: this.#nextId(),
      bookId: book.id,
      memberId: member.id,
      borrowedAt: now,
      loanDays: member.policy.loanDays,
    });
    this.#books.save(book);
    this.#loans.save(loan);
    this.#logger.info(`${member.name} borrowed ${book}`);
    this.#events.publish(LibraryEvents.BOOK_BORROWED, { loan, book, member });
    return loan;
  }

  returnBook(loanId) {
    const loan = this.#getOpenLoan(loanId);
    const book = this.#getBook(loan.bookId);
    const member = this.#getMember(loan.memberId);
    const now = this.#clock.now();

    const daysLate = Math.max(0, daysBetween(loan.dueDate, now));
    const strategy = this.#fineStrategy ?? member.policy.fineStrategy;
    const fine = strategy.calculate(daysLate, loan);

    loan.close(now, fine);
    book.markReturned();
    this.#loans.save(loan);
    this.#books.save(book);

    this.#logger.info(`${member.name} returned ${book}${daysLate ? `, ${daysLate} day(s) late` : ''}`);
    this.#events.publish(LibraryEvents.BOOK_RETURNED, { loan, book, member, daysLate });
    if (fine > 0) {
      this.#events.publish(LibraryEvents.FINE_CHARGED, { loan, book, member, amount: fine, rule: strategy.describe() });
    }
    return { loan, daysLate, fine };
  }

  renew(loanId) {
    const loan = this.#getOpenLoan(loanId);
    const member = this.#getMember(loan.memberId);
    if (this.#isOverdue(loan, this.#clock.now())) throw new RuleViolationError('Overdue loans cannot be renewed');
    loan.renew(member.policy.loanDays, member.policy.maxRenewals);
    this.#loans.save(loan);
    this.#events.publish(LibraryEvents.LOAN_RENEWED, { loan, member, book: this.#getBook(loan.bookId) });
    return loan;
  }

  payFine(loanId) {
    const loan = this.#loans.findById(loanId);
    if (!loan) throw new NotFoundError('Loan', loanId);
    loan.payFine();
    this.#loans.save(loan);
    this.#events.publish(LibraryEvents.FINE_PAID, { loan, member: this.#getMember(loan.memberId), amount: loan.fine });
  }

  /**
   * Checks every open loan. Publishes LOAN_DUE_SOON for loans due within
   * `dueSoonDays` and LOAN_OVERDUE for late ones. Meant to run once a day.
   */
  checkLoans() {
    const now = this.#clock.now();
    const summary = { dueSoon: 0, overdue: 0 };

    for (const loan of this.#loans.findAll((l) => l.isOpen)) {
      const daysLeft = daysBetween(now, loan.dueDate);
      const payload = { loan, member: this.#getMember(loan.memberId), book: this.#getBook(loan.bookId) };

      if (this.#isOverdue(loan, now)) {
        summary.overdue++;
        this.#events.publish(LibraryEvents.LOAN_OVERDUE, { ...payload, daysLate: loan.daysLate(now) });
      } else if (daysLeft <= this.#dueSoonDays) {
        summary.dueSoon++;
        this.#events.publish(LibraryEvents.LOAN_DUE_SOON, { ...payload, daysLeft });
      }
    }
    return summary;
  }

  activeLoans(memberId) {
    return this.#loans.findAll((l) => l.isOpen && l.memberId === memberId);
  }

  unpaidFines(memberId) {
    return this.#loans
      .findAll((l) => l.memberId === memberId && l.hasUnpaidFine)
      .reduce((sum, l) => sum + l.fine, 0);
  }

  // ---------- private helpers ----------

  #isOverdue(loan, now) {
    return loan.isOverdue(now);
  }

  #getOpenLoan(id) {
    const loan = this.#loans.findById(id);
    if (!loan) throw new NotFoundError('Loan', id);
    if (!loan.isOpen) throw new RuleViolationError(`Loan ${id} was already returned`);
    return loan;
  }

  #getBook(id) {
    const book = this.#books.findById(id);
    if (!book) throw new NotFoundError('Book', id);
    return book;
  }

  #getMember(id) {
    const member = this.#members.findById(id);
    if (!member) throw new NotFoundError('Member', id);
    return member;
  }
}
