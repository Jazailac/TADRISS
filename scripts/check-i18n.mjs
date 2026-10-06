#!/usr/bin/env node
// Fails (exit 1) when any locale is incomplete relative to French, the reference locale.
// Run: pnpm i18n:check   (CI runs it in the lint job)
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CATALOGS = [
  { name: 'web', dir: 'apps/web/messages' },
  { name: 'mobile', dir: 'apps/mobile/src/locales' },
];
const REFERENCE = 'fr';
const OTHERS = ['ar', 'en'];

/** { a: { b: 'x' } } → Map { 'a.b' => 'x' } */
export function flatten(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') flatten(v, key, out);
    else out.set(key, v);
  }
  return out;
}

/** ICU arguments used in a message, e.g. "Bonjour {name}, {count, plural, ...}" → ['count', 'name'] */
export function placeholders(message) {
  return [...String(message).matchAll(/\{\s*([A-Za-z_][\w]*)\s*[,}]/g)].map((m) => m[1]).sort();
}

/**
 * Value-level check for one key present in both the reference and the candidate locale.
 * Returns a human-readable problem, or null when the translation is acceptable.
 */
export function valueProblem(key, refValue, value, locale) {
  // TODO(human)
  return null;
}

export function compare(ref, candidate, locale) {
  const problems = [];
  for (const [key, refValue] of ref) {
    if (!candidate.has(key)) problems.push(`missing key ${key}`);
    else {
      const p = valueProblem(key, refValue, candidate.get(key), locale);
      if (p) problems.push(p);
    }
  }
  for (const key of candidate.keys())
    if (!ref.has(key)) problems.push(`extra key ${key} (not in ${REFERENCE})`);
  return problems;
}

const load = (dir, locale) =>
  flatten(JSON.parse(readFileSync(join(dir, `${locale}.json`), 'utf8')));

if (import.meta.url === `file://${process.argv[1]}`) {
  let failed = false;
  for (const { name, dir } of CATALOGS) {
    const ref = load(dir, REFERENCE);
    for (const locale of OTHERS) {
      const problems = compare(ref, load(dir, locale), locale);
      for (const p of problems) console.error(`✗ ${name}/${locale}: ${p}`);
      failed ||= problems.length > 0;
    }
    if (!failed)
      console.log(`✓ ${name}: ${ref.size} keys complete in ${[REFERENCE, ...OTHERS].join(', ')}`);
  }
  process.exit(failed ? 1 : 0);
}
