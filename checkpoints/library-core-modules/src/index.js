// Public API of the package. Everything another program needs comes from here:
//   import { createLibrary, DailyFineStrategy } from './src/index.js';

export { createLibrary } from './createLibrary.js';

// Interfaces (contracts)
export * as Interfaces from './interfaces/index.js';

// Models
export { Book } from './models/Book.js';
export { Member, StudentMember, FacultyMember, GuestMember } from './models/Member.js';
export { Loan } from './models/Loan.js';

// Factories
export { MemberFactory } from './factories/MemberFactory.js';
export { createNotificationChannel, registerNotificationChannel } from './factories/NotificationChannelFactory.js';

// Strategies
export * from './strategies/fines/index.js';
export * from './strategies/search/index.js';

// Observer
export { EventBus } from './events/EventBus.js';
export { LibraryEvents } from './events/LibraryEvents.js';
export { NotificationObserver } from './observers/NotificationObserver.js';
export { AuditLogObserver } from './observers/AuditLogObserver.js';
export { StatisticsObserver } from './observers/StatisticsObserver.js';

// Services and repositories
export { BookService } from './services/BookService.js';
export { MemberService } from './services/MemberService.js';
export { LoanService } from './services/LoanService.js';
export { InMemoryRepository } from './repositories/InMemoryRepository.js';

// Utilities
export * from './utils/index.js';
