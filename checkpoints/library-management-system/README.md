# Library Management System

This is a simplified library system I wrote in JavaScript to practise Object-Oriented Design. It manages users, books, and borrowing. Users can borrow and return books and see what they have, and they get a notification when a book is overdue. I used three design patterns: Factory, Singleton and Observer.

## How to run it

You need Node.js (version 18 or newer). There's nothing to install. In this folder run:

```bash
node main.js
```

This runs a demo that goes through every feature step by step and prints what happens, including the things the library refuses to do, like a student trying to borrow a fourth book. To run the tests:

```bash
npm test
```

## How the code is organised

I split the system into the three subsystems from the instructions, and each one has its own folder inside `src`:

```
src/
├── LibrarySystem.js          the main class (Singleton)
├── LibraryError.js           error type for things the library refuses to do
├── users/                    user management
│   ├── User.js               abstract base class
│   ├── Student.js
│   ├── Teacher.js
│   ├── UserFactory.js        Factory Pattern
│   └── UserManager.js        stores and finds users
├── books/                    book management
│   ├── Book.js
│   └── BookCatalog.js        stores, finds and searches books
└── borrowing/                borrowing system
    ├── BorrowTransaction.js  one loan: who, which book, when it's due
    ├── BorrowingService.js   borrow, return, check for overdue books
    └── NotificationService.js  Observer Pattern
```

`LibrarySystem` is the only class the rest of the program needs to use. It doesn't do the work itself, it just passes each request to the right subsystem. So, for example, the user code never has to know how books are stored. Each subsystem only does one job, which makes it easier to change one part without breaking the others.

## Classes, inheritance and encapsulation

`User` is an abstract class. It has everything Students and Teachers share: an id, a name, an email, the books they've borrowed and the notifications they've received. JavaScript doesn't have an `abstract` keyword, so I made the constructor throw an error if you try to create a plain `User`, and the methods every subclass has to write (`getRole`, `getMaxBooks` and `getLoanDays`) throw an error if they're missing. `Student` and `Teacher` extend `User` and only fill in their own rules. A student can have 3 books for 14 days, and a teacher can have 10 books for 30 days. The borrowing code just calls `user.getMaxBooks()` and `user.getLoanDays()` without checking what kind of user it is, which is polymorphism.

For encapsulation, all the data is kept in private fields (the ones starting with `#`), so it can't be changed from outside the class. For example, a book can only become unavailable through `markBorrowed()`, and asking a user for their borrowed books gives back a copy of the list, so changing that copy doesn't affect the real one.

## The design patterns

**Factory Pattern:** `UserFactory.createUser('student', {...})` decides which class to create, so no other part of the code writes `new Student()` or `new Teacher()`. If the library later needs a new type of user, like a Librarian, I only have to write the class and register it with `UserFactory.registerType()`. Nothing else has to change. One of the tests does exactly that.

**Singleton Pattern:** there should only be one library system managing everything, so `LibrarySystem` can only be created through `LibrarySystem.getInstance()`. The first call creates it, and every call after that returns the same object. Calling `new LibrarySystem()` directly throws an error. I also added a `reset()` method so the demo and the tests can start from empty data without needing a second instance.

**Observer Pattern:** the `NotificationService` is the subject and the users are the observers. Users are subscribed automatically when they're added, unless they choose not to be (like Mr. Ade in the demo), and they can subscribe or unsubscribe later. When `checkOverdueBooks()` finds an overdue loan, it asks the notification service to notify that user, which calls the user's `update(message)` method. The message is saved in the user's notifications and printed to the console. Each overdue loan is only notified once, so checking again the next day doesn't send the same message twice.

## Overdue books

A loan is overdue if it hasn't been returned and its due date has passed. Since I didn't want to wait two weeks to test it, every borrow, return and overdue check can take a date, and the demo uses fixed dates in November 2026. There's also a flag, `simulateOverdue(userId, isbn)`, that marks a loan as overdue straight away, like the instructions suggest.

## Features

- Add users (through the factory) and books
- Borrow books, with checks for books that are already borrowed and users who have reached their limit
- Return books, with a check that you actually borrowed that book
- View the books a user has borrowed, with their due dates
- View available books and search books by title or author
- Find overdue books and notify the users who are subscribed
