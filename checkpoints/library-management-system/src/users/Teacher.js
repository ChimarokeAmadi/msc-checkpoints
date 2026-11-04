import User from './User.js';

// Teacher: same as a User, but can borrow more books for longer
export default class Teacher extends User {
  static MAX_BOOKS = 10;
  static LOAN_DAYS = 30;

  getRole() {
    return 'Teacher';
  }

  getMaxBooks() {
    return Teacher.MAX_BOOKS;
  }

  getLoanDays() {
    return Teacher.LOAN_DAYS;
  }
}
