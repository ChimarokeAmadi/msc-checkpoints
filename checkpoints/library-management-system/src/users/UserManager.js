// ===================== User management subsystem =====================
// Stores the users and looks them up. Creating them is left to UserFactory.

import UserFactory from './UserFactory.js';
import LibraryError from '../LibraryError.js';

export default class UserManager {
  #users = new Map(); // id -> User

  addUser(type, data) {
    if (this.#users.has(data?.id)) {
      throw new LibraryError(`A user with id "${data.id}" already exists.`);
    }
    const user = UserFactory.createUser(type, data);
    this.#users.set(user.id, user);
    return user;
  }

  getUser(id) {
    const user = this.#users.get(id);
    if (!user) throw new LibraryError(`No user with id "${id}".`);
    return user;
  }

  getAllUsers() {
    return [...this.#users.values()];
  }

  clear() {
    this.#users.clear();
  }
}
