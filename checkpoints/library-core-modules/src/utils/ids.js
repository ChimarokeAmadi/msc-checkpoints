// ID generators. Each one has its own counter, so tests can create a fresh one
// and always get predictable ids like "loan-1", "loan-2".

import { randomUUID } from 'node:crypto';

export function createSequentialIdGenerator(prefix) {
  let next = 1;
  return () => `${prefix}-${next++}`;
}

export function createUuidGenerator(prefix) {
  return () => `${prefix}-${randomUUID()}`;
}
