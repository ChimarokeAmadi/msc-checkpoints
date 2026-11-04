// In-memory repositories (the data access layer). In the real system these
// would run SQL against PostgreSQL, and the services wouldn't need to change.

class InMemoryRepository {
  constructor(idField) {
    this.idField = idField;
    this.items = new Map();
  }

  save(item) {
    this.items.set(item[this.idField], item);
    return item;
  }

  findById(id) {
    const item = this.items.get(id);
    if (!item) throw new Error(`Not found: ${id}`);
    return item;
  }

  all() {
    return [...this.items.values()];
  }
}

export class BookRepository extends InMemoryRepository {
  constructor() { super('bookId'); }

  search(query) {
    const q = query.toLowerCase();
    return this.all().filter((b) =>
      [b.title, b.author, b.isbn, b.category].some((field) => field?.toLowerCase().includes(q))
    );
  }
}

export class MemberRepository extends InMemoryRepository {
  constructor() { super('id'); }
}

export class LoanRepository extends InMemoryRepository {
  constructor() { super('loanId'); }

  findOpenLoanForBook(bookId) {
    return this.all().find((l) => l.isOpen && l.book.bookId === bookId) ?? null;
  }

  findActiveByMember(memberId) {
    return this.all().filter((l) => l.isOpen && l.member.id === memberId);
  }

  findOpen() {
    return this.all().filter((l) => l.isOpen);
  }
}

export class FineRepository extends InMemoryRepository {
  constructor() { super('fineId'); }

  unpaidTotal(memberId) {
    return this.all()
      .filter((f) => f.member.id === memberId && !f.paid)
      .reduce((sum, f) => sum + f.amount, 0);
  }
}

export class ReservationRepository extends InMemoryRepository {
  constructor() { super('reservationId'); }

  nextWaitingFor(bookId) {
    return (
      this.all()
        .filter((r) => r.book.bookId === bookId && r.status === 'WAITING')
        .sort((a, b) => a.reservedOn - b.reservedOn)[0] ?? null
    );
  }

  readyFor(bookId, memberId) {
    return (
      this.all().find(
        (r) => r.book.bookId === bookId && r.member.id === memberId && r.status === 'READY'
      ) ?? null
    );
  }
}
