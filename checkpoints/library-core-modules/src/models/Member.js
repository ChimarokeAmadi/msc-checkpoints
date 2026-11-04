// Member (abstract) and its subclasses.
// Each type of member has a borrowing policy: how many books, for how long,
// how many renewals, and which FineStrategy is used when they return late.

import { requireString, requireEmail, requirePositiveInteger } from '../utils/validation.js';
import { FineStrategy } from '../interfaces/index.js';
import { DailyFineStrategy, GracePeriodFineStrategy, NoFineStrategy } from '../strategies/fines/index.js';

export class Member {
  #policy;
  #active = true;

  constructor({ id, name, email }, policy) {
    if (new.target === Member) {
      throw new TypeError('Member is abstract. Use MemberFactory to create a specific type.');
    }
    this.id = requireString(id, 'member id');
    this.name = requireString(name, 'name');
    this.email = requireEmail(email);
    this.#policy = Member.#checkPolicy({ ...new.target.defaultPolicy(), ...policy });
  }

  /** Each subclass must say what kind of member it is */
  get type() {
    throw new Error(`${this.constructor.name} must define "type"`);
  }

  /** Each subclass provides its default policy */
  static defaultPolicy() {
    throw new Error('Member subclasses must define static defaultPolicy()');
  }

  get policy() {
    return this.#policy;
  }

  get isActive() {
    return this.#active;
  }

  suspend() {
    this.#active = false;
  }

  reactivate() {
    this.#active = true;
  }

  toString() {
    return `${this.name} (${this.type})`;
  }

  static #checkPolicy(policy) {
    return Object.freeze({
      maxLoans: requirePositiveInteger(policy.maxLoans, 'maxLoans'),
      loanDays: requirePositiveInteger(policy.loanDays, 'loanDays'),
      maxRenewals: Number.isInteger(policy.maxRenewals) && policy.maxRenewals >= 0 ? policy.maxRenewals : 0,
      fineStrategy: FineStrategy.assert(policy.fineStrategy, 'policy.fineStrategy'),
    });
  }
}

export class StudentMember extends Member {
  get type() {
    return 'student';
  }

  static defaultPolicy() {
    return {
      maxLoans: 3,
      loanDays: 14,
      maxRenewals: 1,
      fineStrategy: new GracePeriodFineStrategy({ graceDays: 2, inner: new DailyFineStrategy({ ratePerDay: 0.25, maxFine: 10 }) }),
    };
  }
}

export class FacultyMember extends Member {
  get type() {
    return 'faculty';
  }

  static defaultPolicy() {
    return { maxLoans: 10, loanDays: 30, maxRenewals: 3, fineStrategy: new NoFineStrategy() };
  }
}

export class GuestMember extends Member {
  get type() {
    return 'guest';
  }

  static defaultPolicy() {
    return { maxLoans: 1, loanDays: 7, maxRenewals: 0, fineStrategy: new DailyFineStrategy({ ratePerDay: 1, maxFine: 20 }) };
  }
}
