import User from './User.js';

// Student: inherits everything from User and fills in its own rules
export default class Student extends User {
  static MAX_BOOKS = 3;
  static LOAN_DAYS = 14;

  getRole() {
    return 'Student';
  }

  getMaxBooks() {
    return Student.MAX_BOOKS;
  }

  getLoanDays() {
    return Student.LOAN_DAYS;
  }
}
