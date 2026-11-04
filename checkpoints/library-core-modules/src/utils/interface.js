// Interface-like abstractions for JavaScript.
//
// JavaScript has no "interface" keyword, so an interface here is just a
// name plus a list of methods. Any object that has those methods "implements"
// it (duck typing), whether it's a class instance or a plain object. That's
// what makes it easy to pass in fakes in tests.
//
//   const Clock = defineInterface('Clock', ['now']);
//   Clock.assert(myClock, 'clock');   // throws a clear error if now() is missing

import { InterfaceError } from './errors.js';

export function defineInterface(name, methods) {
  if (!name || !Array.isArray(methods) || methods.length === 0) {
    throw new TypeError('defineInterface(name, methods) needs a name and at least one method');
  }

  const required = Object.freeze([...methods]);

  const missingMethods = (obj) =>
    obj == null ? [...required] : required.filter((m) => typeof obj[m] !== 'function');

  return Object.freeze({
    name,
    methods: required,

    /** true if obj has every method of the interface */
    isImplementedBy(obj) {
      return missingMethods(obj).length === 0;
    },

    /** Returns obj if it fits the interface, otherwise throws an InterfaceError */
    assert(obj, label = 'value') {
      const missing = missingMethods(obj);
      if (missing.length > 0) {
        throw new InterfaceError(
          `${label} must implement the ${name} interface (missing: ${missing.join(', ')})`
        );
      }
      return obj;
    },
  });
}
