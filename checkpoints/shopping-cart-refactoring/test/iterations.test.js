// Characterization test: runs every iteration's demo and checks that the output
// is exactly the same as test/expected-output.txt. This is how I made sure each
// refactoring step did not change what the program does.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const expected = readFileSync(new URL('./expected-output.txt', import.meta.url), 'utf8');
const run = (file) => execFileSync(process.execPath, [file], { cwd: root, encoding: 'utf8' });

const versions = [
  'v1-clean-names-and-functions/cart.js',
  'v2-modules/demo.js',
  'v3-strategy/demo.js',
  'v4-observer/demo.js',
  'v5-builder/demo.js',
];

for (const file of versions) {
  test(`${file} prints exactly the expected output`, () => {
    assert.equal(run(file), expected);
  });
}

test('v0 differs only on the shipping estimate (the duplication bug fixed in v1)', () => {
  const v0 = run('v0-messy/cart.js').split('\n');
  const v1 = expected.split('\n');
  const differentLines = v0
    .map((line, i) => [line, v1[i]])
    .filter(([a, b]) => a !== b);
  assert.deepEqual(differentLines, [['Estimated shipping for Amara: 0.00', 'Estimated shipping for Amara: 8.00']]);
});
