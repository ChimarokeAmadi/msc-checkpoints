// The "contracts" between the modules.
// Each service only depends on these interfaces, never on a specific class.
// For example, LoanService needs *a* Repository, not specifically the in-memory one,
// so a database-backed repository (or a test fake) can be passed in instead.

import { defineInterface } from '../utils/interface.js';

/** Stores and loads entities by id */
export const Repository = defineInterface('Repository', [
  'findById', // (id) -> entity | null
  'findAll', // (predicate?) -> entity[]
  'save', // (entity) -> entity
  'delete', // (id) -> boolean
]);

/** Strategy: how much a late return costs */
export const FineStrategy = defineInterface('FineStrategy', [
  'calculate', // (daysLate, loan) -> amount
  'describe', // () -> string
]);

/** Strategy: how a book is matched against a search query */
export const SearchStrategy = defineInterface('SearchStrategy', [
  'matches', // (book, query) -> boolean
]);

/** Somewhere a message can be sent: console, email, SMS... */
export const NotificationChannel = defineInterface('NotificationChannel', [
  'send', // (recipient, subject, body) -> void | Promise
]);

/** Gives the current time (so tests can control it) */
export const Clock = defineInterface('Clock', ['now']);

/** Observer Pattern: the subject that observers subscribe to */
export const EventPublisher = defineInterface('EventPublisher', ['subscribe', 'publish']);

/** Logging */
export const Logger = defineInterface('Logger', ['debug', 'info', 'warn', 'error']);
