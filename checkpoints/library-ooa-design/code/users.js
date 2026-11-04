// User (abstract), Member, Librarian, Administrator (DESIGN.md, class diagram)

export class User {
  #passwordHash;

  constructor({ id, name, email, passwordHash }) {
    if (new.target === User) throw new TypeError('User is abstract');
    this.id = id;
    this.name = name;
    this.email = email;
    this.#passwordHash = passwordHash;
  }

  getRole() {
    throw new Error('getRole() must be implemented by a subclass');
  }
}

export const MemberType = Object.freeze({ STUDENT: 'STUDENT', TEACHER: 'TEACHER', PUBLIC: 'PUBLIC' });

export class Member extends User {
  #status = 'ACTIVE';

  constructor({ type = MemberType.PUBLIC, ...rest }) {
    super(rest);
    this.type = type;
  }

  getRole() { return 'MEMBER'; }
  get status() { return this.#status; }
  suspend() { this.#status = 'SUSPENDED'; }
  activate() { this.#status = 'ACTIVE'; }

  /** Returns the reason this member can't borrow, or null if they can */
  whyCannotBorrow(activeLoanCount, unpaidFines, rules) {
    if (this.#status !== 'ACTIVE') return `${this.name}'s account is ${this.#status.toLowerCase()}`;
    const { maxBooks } = rules.forType(this.type);
    if (activeLoanCount >= maxBooks) return `${this.name} already has ${maxBooks} books (the limit)`;
    if (unpaidFines > rules.maxUnpaidFines) {
      return `${this.name} has $${unpaidFines.toFixed(2)} in unpaid fines`;
    }
    return null;
  }

  canBorrow(activeLoanCount, unpaidFines, rules) {
    return this.whyCannotBorrow(activeLoanCount, unpaidFines, rules) === null;
  }
}

export class Librarian extends User {
  constructor({ employeeId, ...rest }) {
    super(rest);
    this.employeeId = employeeId;
  }

  getRole() { return 'LIBRARIAN'; }
}

export class Administrator extends Librarian {
  getRole() { return 'ADMIN'; }
}
