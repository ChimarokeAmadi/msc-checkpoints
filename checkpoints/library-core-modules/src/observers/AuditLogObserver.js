// Observer that records every event with a timestamp (subscribes to "*")

import { EventPublisher, Clock } from '../interfaces/index.js';

export class AuditLogObserver {
  #entries = [];
  #clock;
  #unsubscribe;

  constructor({ eventBus, clock }) {
    EventPublisher.assert(eventBus, 'eventBus');
    this.#clock = Clock.assert(clock, 'clock');
    this.#unsubscribe = eventBus.subscribe('*', (payload, eventName) => {
      this.#entries.push({
        at: this.#clock.now(),
        event: eventName,
        memberId: payload.member?.id ?? payload.loan?.memberId ?? null,
        bookId: payload.book?.id ?? payload.loan?.bookId ?? null,
      });
    });
  }

  get entries() {
    return this.#entries.map((e) => ({ ...e }));
  }

  detach() {
    this.#unsubscribe();
  }
}
