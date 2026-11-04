// Small reusable checks. Each one returns the cleaned value or throws a ValidationError,
// so they can be used inline:  this.title = requireString(title, 'title');

import { ValidationError } from './errors.js';

export function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError(`${field} must be a non-empty string`);
  }
  return value.trim();
}

export function optionalString(value, field, fallback = '') {
  return value === undefined || value === null ? fallback : requireString(value, field);
}

export function requirePositiveInteger(value, field) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError(`${field} must be a positive whole number (got ${value})`);
  }
  return value;
}

export function requireNonNegativeNumber(value, field) {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new ValidationError(`${field} must be a number of 0 or more (got ${value})`);
  }
  return value;
}

export function requireOneOf(value, allowed, field) {
  if (!allowed.includes(value)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(', ')} (got "${value}")`);
  }
  return value;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function requireEmail(value, field = 'email') {
  const email = requireString(value, field).toLowerCase();
  if (!EMAIL.test(email)) throw new ValidationError(`${field} "${value}" is not a valid email`);
  return email;
}

/** ISBN-10 or ISBN-13, dashes and spaces allowed. Returns it without them. */
export function requireIsbn(value, field = 'isbn') {
  const isbn = requireString(value, field).replace(/[-\s]/g, '');
  if (!/^(\d{9}[\dX]|\d{13})$/i.test(isbn)) {
    throw new ValidationError(`${field} "${value}" is not a valid ISBN-10 or ISBN-13`);
  }
  return isbn.toUpperCase();
}
