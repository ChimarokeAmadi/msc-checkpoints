// Error types shared by every module.
// Callers can catch LibraryError for "the library said no" and let real bugs crash.

export class LibraryError extends Error {
  constructor(message, code = 'LIBRARY_ERROR') {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
  }
}

export class ValidationError extends LibraryError {
  constructor(message) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends LibraryError {
  constructor(entity, id) {
    super(`${entity} "${id}" was not found`, 'NOT_FOUND');
  }
}

export class RuleViolationError extends LibraryError {
  constructor(message) {
    super(message, 'RULE_VIOLATION');
  }
}

/** Thrown when an object is missing a method its interface requires */
export class InterfaceError extends TypeError {
  constructor(message) {
    super(message);
    this.name = 'InterfaceError';
  }
}
