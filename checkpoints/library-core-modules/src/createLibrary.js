// ===================== Composition root =====================
// The ONE place where the real objects are created and connected.
// Every other module just receives what it needs.
//
// Anything can be replaced by passing it in:
//   createLibrary()                                   -> default setup
//   createLibrary({ clock: createFixedClock(date) })  -> controllable time
//   createLibrary({ channel: createNotificationChannel('memory') })  -> capture messages
//   createLibrary({ bookRepository: new PostgresBookRepository(db) }) -> a real database

import { EventBus } from './events/EventBus.js';
import { InMemoryRepository } from './repositories/InMemoryRepository.js';
import { MemberFactory } from './factories/MemberFactory.js';
import { createNotificationChannel } from './factories/NotificationChannelFactory.js';
import { BookService } from './services/BookService.js';
import { MemberService } from './services/MemberService.js';
import { LoanService } from './services/LoanService.js';
import { NotificationObserver } from './observers/NotificationObserver.js';
import { AuditLogObserver } from './observers/AuditLogObserver.js';
import { StatisticsObserver } from './observers/StatisticsObserver.js';
import { systemClock } from './utils/dates.js';
import { silentLogger } from './utils/logger.js';

export function createLibrary(overrides = {}) {
  const logger = overrides.logger ?? silentLogger;
  const clock = overrides.clock ?? systemClock;
  const eventBus = overrides.eventBus ?? new EventBus({ logger: logger.child?.('events') ?? logger });

  const bookRepository = overrides.bookRepository ?? new InMemoryRepository('Book');
  const memberRepository = overrides.memberRepository ?? new InMemoryRepository('Member');
  const loanRepository = overrides.loanRepository ?? new InMemoryRepository('Loan');

  const memberFactory = overrides.memberFactory ?? new MemberFactory({ policyOverrides: overrides.policies });
  const channel = overrides.channel ?? createNotificationChannel('console');

  const books = new BookService({ bookRepository, eventBus, idGenerator: overrides.bookIds });
  const members = new MemberService({ memberRepository, memberFactory, eventBus });
  const loans = new LoanService({
    loanRepository,
    bookRepository,
    memberRepository,
    eventBus,
    clock,
    logger: logger.child?.('loans') ?? logger,
    fineStrategy: overrides.fineStrategy,
    idGenerator: overrides.loanIds,
  });

  // Observers are attached here. Removing a line removes that feature.
  const observers = {
    notifications: new NotificationObserver({ eventBus, channel }),
    audit: new AuditLogObserver({ eventBus, clock }),
    stats: new StatisticsObserver({ eventBus }),
  };

  return { books, members, loans, observers, eventBus, clock, memberFactory, channel };
}
