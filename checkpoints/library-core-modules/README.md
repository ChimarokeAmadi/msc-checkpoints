# Library Management System: Core Modules

This is the core of a library management system, written in JavaScript for Node.js. The focus of this checkpoint wasn't the number of features but how the code is organised: small ES modules that each do one job, three design patterns (Factory, Strategy and Observer), reusable utilities, "interfaces" in a language that doesn't have them, and dependency injection so that everything is easy to test.

## How to run it

You need Node.js 18 or newer. There are no packages to install.

```bash
node main.js   # demo of every feature
npm test       # 21 tests
```

The demo uses a clock that I can move forward by hand, so it can show a book becoming overdue without waiting two weeks, and the output is the same every time.

## How the code is organised

```
src/
├── index.js            the public API: everything can be imported from here
├── createLibrary.js    the composition root: creates the objects and connects them
├── interfaces/         the contracts: Repository, FineStrategy, SearchStrategy,
│                       NotificationChannel, Clock, EventPublisher, Logger
├── utils/              reusable helpers: validation, dates and clocks, ids, logger,
│                       errors, defineInterface
├── models/             Book, Member (Student, Faculty, Guest), Loan
├── factories/          MemberFactory, NotificationChannelFactory
├── strategies/
│   ├── fines/          NoFine, DailyFine, TieredFine, GracePeriodFine
│   └── search/         title, author, isbn, genre, keyword, anyOf()
├── events/             EventBus (the Observer subject) and the event names
├── observers/          NotificationObserver, AuditLogObserver, StatisticsObserver
├── repositories/       InMemoryRepository
└── services/           BookService, MemberService, LoanService
```

Every file is an ES module with `import` and `export`, and `"type": "module"` is set in `package.json`. Each folder has one responsibility, and the arrows only go one way. The services depend on interfaces and utilities, but never on a specific repository or channel.

## Interfaces in JavaScript

JavaScript doesn't have interfaces, so I wrote a small utility, `defineInterface(name, methods)`, in `src/utils/interface.js`. An interface is just a name and a list of method names. Any object that has those methods counts as implementing it, whether it's a class or a plain object. That's duck typing, but checked. For example:

```js
export const Repository = defineInterface('Repository', ['findById', 'findAll', 'save', 'delete']);
```

Each service checks what it's given when it's created, for example `Repository.assert(bookRepository, 'bookRepository')`. If something is missing, you get a clear error straight away, like *"loanRepository must implement the Repository interface (missing: findById, findAll, save, delete)"*, instead of a confusing "undefined is not a function" much later.

## The design patterns

**Factory.** `MemberFactory` creates the right kind of member from a type name: `factory.create('student', {...})` gives a `StudentMember`. New types can be added with `register()`, and the default rules for a type can be changed with `policyOverrides`, without touching the classes. There's a second factory, `createNotificationChannel('console' | 'memory' | 'email')`, which returns objects that all fit the `NotificationChannel` interface. The email one receives its transport (something with `sendMail()`, like Nodemailer) from outside, so the module doesn't depend on any email library.

**Strategy.** There are two families of strategies. The **fine strategies** decide how much a late return costs. Students get two grace days and then $0.25 a day (max $10), faculty have no fines, and guests pay $1 a day (max $20). `TieredFineStrategy` charges a different rate after the first week. `GracePeriodFineStrategy` wraps any other strategy, so it's also a small example of the Decorator pattern. `LoanService` just calls `strategy.calculate(daysLate)` and doesn't know which one it has. The **search strategies** decide what "matches" means: by title, author, ISBN, genre, or several at once with `anyOf()`.

**Observer.** `EventBus` is the subject. When something happens, the services publish an event like `loan.created`, `loan.overdue` or `fine.charged`, and the observers that subscribed get it. `NotificationObserver` sends messages to members, `AuditLogObserver` records every event (it subscribes to `*`), and `StatisticsObserver` counts loans, late returns and fines. `LoanService` doesn't know any of them exist, so adding a new observer doesn't change it. If an observer throws an error, the bus logs it and still calls the others, so a broken email service can't stop a book from being returned.

## Dependency injection

None of the services create their own dependencies. They receive them in the constructor:

```js
new LoanService({ loanRepository, bookRepository, memberRepository, eventBus, clock, fineStrategy, logger });
```

`createLibrary()` is the only place where the real objects are made and connected, and any of them can be swapped by passing it in. The demo uses this twice. The main library gets a fixed clock and the console channel. A second library gets a memory channel and a `TieredFineStrategy` for everyone, so a faculty member who normally pays nothing is charged $2.20 for being 10 days late. The same `LoanService` code gives different behaviour, just from what was injected.

This is what makes the tests simple. In `test/services.test.js`, `LoanService` is given repositories made from plain objects, a fake event bus that just records what was published, and a clock the test moves forward. So I can check things like "returning 3 days late as a guest costs $3 and publishes `fine.charged`" without a database or waiting for real time.

## Reusable utilities

The `utils` folder has no library-specific code, so these modules could be reused in another project:

- `validation.js`: `requireString`, `requireEmail`, `requireIsbn`, `requirePositiveInteger` and others. They return the cleaned value or throw a `ValidationError`.
- `dates.js`: `addDays`, `daysBetween`, `formatDate`, the real `systemClock` and `createFixedClock` for tests.
- `ids.js`: id generators, each with its own counter.
- `logger.js`: a small logger with levels, child loggers and an injectable output.
- `errors.js`: `LibraryError` and its subclasses, so code can tell "the library said no" apart from real bugs.
- `interface.js`: `defineInterface`.
