// ===================== Factory Pattern: members =====================
// Code asks for a member by type name, and the factory picks the class.
// New types can be registered without changing this file, and the default
// policies can be overridden per type (e.g. a library with a different fine rule).

import { StudentMember, FacultyMember, GuestMember, Member } from '../models/Member.js';
import { ValidationError } from '../utils/errors.js';
import { createSequentialIdGenerator } from '../utils/ids.js';

export class MemberFactory {
  #types = new Map();
  #policyOverrides;
  #nextId;

  /**
   * @param {object} [deps]
   * @param {Record<string, object>} [deps.policyOverrides]  e.g. { student: { maxLoans: 5 } }
   * @param {() => string} [deps.idGenerator]
   */
  constructor({ policyOverrides = {}, idGenerator = createSequentialIdGenerator('member') } = {}) {
    this.#policyOverrides = policyOverrides;
    this.#nextId = idGenerator;
    this.register('student', StudentMember);
    this.register('faculty', FacultyMember);
    this.register('guest', GuestMember);
  }

  register(type, MemberClass) {
    if (!(MemberClass.prototype instanceof Member)) {
      throw new TypeError(`${MemberClass.name} must extend Member`);
    }
    this.#types.set(type.toLowerCase(), MemberClass);
    return this;
  }

  create(type, { id, name, email }) {
    const key = String(type).toLowerCase();
    const MemberClass = this.#types.get(key);
    if (!MemberClass) {
      throw new ValidationError(`Unknown member type "${type}". Known types: ${this.types.join(', ')}`);
    }
    return new MemberClass({ id: id ?? this.#nextId(), name, email }, this.#policyOverrides[key]);
  }

  get types() {
    return [...this.#types.keys()];
  }
}
