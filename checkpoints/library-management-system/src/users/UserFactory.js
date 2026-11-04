// ===================== Factory Pattern =====================
// The rest of the code never writes "new Student(...)" or "new Teacher(...)".
// It asks the factory for a user by type, e.g. UserFactory.createUser('student', {...}).
// To add a new kind of user later (like Librarian), you write the class and
// register it here. Nothing else in the system has to change.

import Student from './Student.js';
import Teacher from './Teacher.js';
import User from './User.js';
import LibraryError from '../LibraryError.js';

export default class UserFactory {
  // type name -> class
  static #types = new Map([
    ['student', Student],
    ['teacher', Teacher],
  ]);

  /**
   * Creates the right kind of user.
   * @param {string} type  "student" or "teacher" (not case sensitive)
   * @param {{id: string, name: string, email?: string}} data
   */
  static createUser(type, { id, name, email } = {}) {
    const UserClass = UserFactory.#types.get(String(type).toLowerCase());
    if (!UserClass) {
      throw new LibraryError(
        `Unknown user type "${type}". Available types: ${UserFactory.getTypes().join(', ')}`
      );
    }
    return new UserClass(id, name, email);
  }

  /** Lets new user types be added without editing this file */
  static registerType(type, UserClass) {
    if (!(UserClass.prototype instanceof User)) {
      throw new TypeError('Only subclasses of User can be registered.');
    }
    UserFactory.#types.set(type.toLowerCase(), UserClass);
  }

  static getTypes() {
    return [...UserFactory.#types.keys()];
  }
}
