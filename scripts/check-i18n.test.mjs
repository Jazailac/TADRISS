import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compare, flatten, placeholders } from './check-i18n.mjs';

test('flatten nests keys with dots', () => {
  assert.deepEqual(
    [...flatten({ a: { b: 'x', c: { d: 'y' } } })],
    [
      ['a.b', 'x'],
      ['a.c.d', 'y'],
    ],
  );
});

test('placeholders finds ICU arguments', () => {
  assert.deepEqual(
    placeholders('Bonjour {name}, {count, plural, one {# élève} other {# élèves}}'),
    ['count', 'name'],
  );
});

test('compare reports missing and extra keys', () => {
  const ref = flatten({ a: 'A', b: 'B' });
  const cand = flatten({ a: 'A2', c: 'C' });
  const problems = compare(ref, cand, 'en');
  assert.ok(problems.some((p) => p.includes('missing key b')));
  assert.ok(problems.some((p) => p.includes('extra key c')));
});
