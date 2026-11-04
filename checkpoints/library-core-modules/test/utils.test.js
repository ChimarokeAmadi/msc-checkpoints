import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defineInterface, InterfaceError, ValidationError,
  requireString, requireIsbn, requireEmail, requirePositiveInteger, requireOneOf,
  addDays, daysBetween, formatDate, createFixedClock,
  createSequentialIdGenerator, createMemoryLogger,
} from '../src/utils/index.js';

test('defineInterface checks objects by their methods (duck typing)', () => {
  const Greeter = defineInterface('Greeter', ['greet']);
  assert.equal(Greeter.isImplementedBy({ greet() {} }), true);
  assert.equal(Greeter.isImplementedBy({}), false);
  assert.equal(Greeter.isImplementedBy(null), false);
  assert.throws(() => Greeter.assert({ hello() {} }, 'greeter'), (err) =>
    err instanceof InterfaceError && /greeter must implement the Greeter interface \(missing: greet\)/.test(err.message)
  );
});

test('validation helpers return clean values or throw ValidationError', () => {
  assert.equal(requireString('  hi  ', 'x'), 'hi');
  assert.throws(() => requireString('   ', 'title'), ValidationError);
  assert.equal(requireIsbn('978-0-13-235088-4'), '9780132350884');
  assert.equal(requireIsbn('080442957x'), '080442957X');
  assert.throws(() => requireIsbn('12345'), ValidationError);
  assert.equal(requireEmail('A@B.COM'), 'a@b.com');
  assert.throws(() => requireEmail('nope'), ValidationError);
  assert.throws(() => requirePositiveInteger(1.5, 'n'), ValidationError);
  assert.throws(() => requireOneOf('x', ['a', 'b'], 'kind'), /one of: a, b/);
});

test('date helpers and the fixed clock', () => {
  const start = new Date('2026-11-01T00:00:00Z');
  assert.equal(formatDate(addDays(start, 14)), '2026-11-15');
  assert.equal(daysBetween(start, addDays(start, 3)), 3);
  assert.equal(daysBetween(addDays(start, 3), start), -3);

  const clock = createFixedClock(start);
  clock.advanceDays(2);
  assert.equal(formatDate(clock.now()), '2026-11-03');
  clock.now().setFullYear(1999); // changing the returned date doesn't move the clock
  assert.equal(formatDate(clock.now()), '2026-11-03');
});

test('each id generator has its own counter', () => {
  const a = createSequentialIdGenerator('a');
  const b = createSequentialIdGenerator('b');
  assert.deepEqual([a(), a(), b()], ['a-1', 'a-2', 'b-1']);
});

test('logger respects the level and the injected output', () => {
  const logger = createMemoryLogger('warn');
  logger.info('hidden');
  logger.warn('shown');
  logger.child('loans').error('child');
  assert.deepEqual(logger.lines, ['shown', '[loans] child']);
});
