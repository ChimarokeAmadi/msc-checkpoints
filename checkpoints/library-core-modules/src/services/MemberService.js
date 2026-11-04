// Member management. Uses the injected MemberFactory to create members.

import { Repository, EventPublisher } from '../interfaces/index.js';
import { LibraryEvents } from '../events/LibraryEvents.js';
import { NotFoundError, ValidationError } from '../utils/errors.js';

export class MemberService {
  #members;
  #factory;
  #events;

  constructor({ memberRepository, memberFactory, eventBus }) {
    this.#members = Repository.assert(memberRepository, 'memberRepository');
    if (typeof memberFactory?.create !== 'function') throw new TypeError('memberFactory must have a create() method');
    this.#factory = memberFactory;
    this.#events = EventPublisher.assert(eventBus, 'eventBus');
  }

  register(type, data) {
    const member = this.#factory.create(type, data);
    if (this.#members.findById(member.id)) throw new ValidationError(`A member with id "${member.id}" already exists`);
    if (this.#members.findAll((m) => m.email === member.email).length > 0) {
      throw new ValidationError(`The email ${member.email} is already registered`);
    }
    this.#members.save(member);
    this.#events.publish(LibraryEvents.MEMBER_REGISTERED, { member });
    return member;
  }

  getMember(id) {
    const member = this.#members.findById(id);
    if (!member) throw new NotFoundError('Member', id);
    return member;
  }

  suspend(id) {
    this.getMember(id).suspend();
  }

  reactivate(id) {
    this.getMember(id).reactivate();
  }
}
