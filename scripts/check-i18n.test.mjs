import assert from 'node:assert/strict';
import { test } from 'node:test';
import { compare, flatten, placeholders, valueProblem } from './check-i18n.mjs';

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

test('valueProblem catches empty values, dropped placeholders and lost tags', () => {
  assert.match(valueProblem('k', 'Bonjour {name}', '  ', 'en'), /empty/);
  assert.match(valueProblem('k', 'Bonjour {name}', 'Hello', 'en'), /placeholder mismatch/);
  assert.match(
    valueProblem('k', 'Lu par {read, number}', 'Read by {count}', 'en'),
    /placeholder mismatch/,
  );
  assert.match(valueProblem('k', 'Votre <em>école</em>', 'Your school', 'en'), /tag mismatch/);
  assert.equal(valueProblem('k', 'Bonjour {name}', 'مرحبا {name}', 'ar'), null);
  assert.equal(valueProblem('k', 'Tadriss', 'Tadriss', 'en'), null);
});
