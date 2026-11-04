// Business logic layer (DESIGN.md, sections 3, 4 and 5).
// The services hold the rules that need more than one object.

import { BookStatus } from './Book.js';
import { Loan, Fine, Reservation, addDays } from './Loan.js';

export class LoanError extends Error {
  constructor(message) {
    super(message);
    this.name = 'LoanError';
  }
}

const fmt = (date) => date.toISOString().slice(0, 10);

export class NotificationService {
  constructor() {
    this.sent = [];
  }

  #send(to, text) {
    this.sent.push({ to: to.email, text });
    console.log(`    ✉️  to ${to.name}: ${text}`);
  }

  sendLoanConfirmation(loan) {
    this.#send(loan.member, `You borrowed "${loan.book.title}". Please return it by ${fmt(loan.dueDate)}.`);
  }

  sendDueReminder(loan) {
    this.#send(loan.member, `Reminder: "${loan.book.title}" is due on ${fmt(loan.dueDate)}.`);
  }

  sendOverdueNotice(loan, today) {
    this.#send(loan.member, `"${loan.book.title}" is ${loan.daysLate(today)} day(s) overdue.`);
  }

  sendReservationReady(reservation) {
    this.#send(
      reservation.member,
      `"${reservation.book.title}" is ready for you. It's held until ${fmt(reservation.holdUntil)}.`
    );
  }
}

export class CatalogService {
  constructor(books) {
    this.books = books;
  }

  addBook(book) {
    return this.books.save(book);
  }

  /** Search result: one line per title, with how many copies are available */
  search(query) {
    const byIsbn = new Map();
    for (const book of this.books.search(query)) {
      if (book.status === BookStatus.REMOVED) continue;
      const entry = byIsbn.get(book.isbn) ?? { title: book.title, author: book.author, copies: 0, available: 0 };
      entry.copies++;
      if (book.isAvailable()) entry.available++;
      byIsbn.set(book.isbn, entry);
    }
    return [...byIsbn.values()];
  }
}

export class FineService {
  constructor(fines, rules) {
    this.fines = fines;
    this.rules = rules;
  }

  calculateLateFine(loan, today) {
    const fine = new Fine({ loan, amount: loan.daysLate(today) * this.rules.finePerDay, reason: 'LATE' });
    return this.fines.save(fine);
  }

  getUnpaidTotal(memberId) {
    return this.fines.unpaidTotal(memberId);
  }

  payFine(fineId) {
    this.fines.findById(fineId).pay();
  }
}

export class ReservationService {
  constructor(reservations, books, notifier) {
    this.reservations = reservations;
    this.books = books;
    this.notifier = notifier;
  }

  reserve(member, book, today) {
    if (book.isAvailable()) throw new LoanError(`"${book.title}" is available. No need to reserve it.`);
    return this.reservations.save(new Reservation({ book, member, reservedOn: today }));
  }

  nextReservationFor(bookId) {
    return this.reservations.nextWaitingFor(bookId);
  }
}

export class LoanService {
  constructor({ books, members, loans, fineService, reservationService, notifier, rules }) {
    Object.assign(this, { books, members, loans, fineService, reservationService, notifier, rules });
  }

  // Sequence diagram 5.1
  issueBook(memberId, bookId, today) {
    const member = this.members.findById(memberId);
    const book = this.books.findById(bookId);
    const activeLoans = this.loans.findActiveByMember(memberId);
    const unpaid = this.fineService.getUnpaidTotal(memberId);

    const reason = member.whyCannotBorrow(activeLoans.length, unpaid, this.rules);
    if (reason) throw new LoanError(reason);

    // A reserved book can only go to the member it's being held for
    const reservation = this.reservationService.reservations.readyFor(bookId, memberId);
    if (!book.isAvailable() && !reservation) {
      throw new LoanError(`"${book.title}" is ${book.status.toLowerCase()}`);
    }

    const loan = new Loan({ book, member, issueDate: today, loanDays: this.rules.loanDaysFor(member.type) });
    book.checkOut(); // Available/Reserved -> Issued
    reservation?.fulfil();
    this.books.save(book);
    this.loans.save(loan);
    this.notifier.sendLoanConfirmation(loan);
    return loan;
  }

  // Sequence diagram 5.2 and the pseudocode in section 10
  returnBook(bookId, condition, today) {
    const loan = this.loans.findOpenLoanForBook(bookId);
    if (!loan) throw new LoanError(`Book ${bookId} is not on loan`);

    loan.close(today);
    const { book } = loan;
    book.receive(); // Issued -> Returned

    let fine = null;
    if (loan.isOverdue(today)) {
      fine = this.fineService.calculateLateFine(loan, today);
    }

    if (condition === 'DAMAGED') {
      book.markDamaged(); // Returned -> Damaged
    } else {
      const reservation = this.reservationService.nextReservationFor(bookId);
      if (reservation) {
        book.reserve(); // Returned -> Reserved
        reservation.markReady(addDays(today, this.rules.holdDays));
        this.notifier.sendReservationReady(reservation);
      } else {
        book.checkIn(); // Returned -> Available
      }
    }

    this.books.save(book);
    this.loans.save(loan);
    return { loan, fine };
  }

  renewLoan(loanId) {
    const loan = this.loans.findById(loanId);
    if (this.reservationService.nextReservationFor(loan.book.bookId)) {
      throw new LoanError(`"${loan.book.title}" can't be renewed because someone has reserved it`);
    }
    loan.renew(this.rules.loanDaysFor(loan.member.type), this.rules.maxRenewals);
    return loan;
  }

  // Activity diagram: the daily overdue check (simplified)
  runDailyCheck(today) {
    for (const loan of this.loans.findOpen()) {
      const daysToDue = Math.ceil((loan.dueDate - today) / (24 * 60 * 60 * 1000));
      if (daysToDue === 2) this.notifier.sendDueReminder(loan);
      else if (loan.isOverdue(today)) this.notifier.sendOverdueNotice(loan, today);
    }
  }
}
