// ===================== Observer Pattern: the subject =====================
// Services publish events ("a book was borrowed"), and observers subscribe to
// the ones they care about. The services don't know who is listening, so a
// new observer can be added without touching them.

import { Logger } from '../interfaces/index.js';
import { silentLogger } from '../utils/logger.js';

export class EventBus {
  #handlers = new Map(); // event name -> Set of handlers
  #logger;

  constructor({ logger = silentLogger } = {}) {
    this.#logger = Logger.assert(logger, 'logger');
  }

  /**
   * Registers a handler. Use "*" to receive every event.
   * Returns a function that unsubscribes it.
   */
  subscribe(eventName, handler) {
    if (typeof handler !== 'function') throw new TypeError('handler must be a function');
    if (!this.#handlers.has(eventName)) this.#handlers.set(eventName, new Set());
    this.#handlers.get(eventName).add(handler);
    return () => this.unsubscribe(eventName, handler);
  }

  /** Like subscribe, but the handler runs only the first time */
  once(eventName, handler) {
    const unsubscribe = this.subscribe(eventName, (payload, name) => {
      unsubscribe();
      handler(payload, name);
    });
    return unsubscribe;
  }

  unsubscribe(eventName, handler) {
    this.#handlers.get(eventName)?.delete(handler);
  }

  /**
   * Tells every subscriber about the event.
   * If one observer throws, it's logged and the others still get the event,
   * so a broken email observer can't stop a book from being returned.
   */
  publish(eventName, payload = {}) {
    const handlers = [
      ...(this.#handlers.get(eventName) ?? []),
      ...(this.#handlers.get('*') ?? []),
    ];
    this.#logger.debug(`event ${eventName} -> ${handlers.length} handler(s)`);

    for (const handler of handlers) {
      try {
        const result = handler(payload, eventName);
        // Async handlers: catch their errors too
        if (result && typeof result.catch === 'function') {
          result.catch((err) => this.#logger.error(`async handler for ${eventName} failed: ${err.message}`));
        }
      } catch (err) {
        this.#logger.error(`handler for ${eventName} failed: ${err.message}`);
      }
    }
    return handlers.length;
  }

  listenerCount(eventName) {
    return this.#handlers.get(eventName)?.size ?? 0;
  }
}
