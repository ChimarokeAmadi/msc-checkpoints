// ===================== Observer Pattern =====================
// The NotificationService is the "subject". Users who want reminders
// subscribe to it, and it calls user.update(message) to notify them.
// Users who aren't subscribed don't get messages.

export default class NotificationService {
  #subscribers = new Set();

  subscribe(user) {
    this.#subscribers.add(user);
  }

  unsubscribe(user) {
    this.#subscribers.delete(user);
  }

  isSubscribed(user) {
    return this.#subscribers.has(user);
  }

  /** Sends a message to one user, only if they're subscribed. Returns true if it was sent. */
  notify(user, message) {
    if (!this.#subscribers.has(user)) return false;
    user.update(message);
    return true;
  }

  /** Sends a message to every subscriber */
  notifyAll(message) {
    this.#subscribers.forEach((user) => user.update(message));
  }
}
