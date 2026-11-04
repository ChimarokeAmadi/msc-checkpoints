// The library's rules are data, not numbers hidden in the code
// (DESIGN.md, LibraryRules class and LIBRARY_RULES table)

export class LibraryRules {
  constructor({ byType, finePerDay = 0.5, maxUnpaidFines = 5, holdDays = 3, maxRenewals = 1 } = {}) {
    this.byType = byType ?? {
      STUDENT: { maxBooks: 3, loanDays: 14 },
      TEACHER: { maxBooks: 10, loanDays: 30 },
      PUBLIC: { maxBooks: 2, loanDays: 14 },
    };
    this.finePerDay = finePerDay;
    this.maxUnpaidFines = maxUnpaidFines;
    this.holdDays = holdDays;
    this.maxRenewals = maxRenewals;
  }

  forType(type) {
    return this.byType[type];
  }

  loanDaysFor(type) {
    return this.forType(type).loanDays;
  }
}
