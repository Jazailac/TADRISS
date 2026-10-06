import { describe, expect, it } from 'vitest';
import { err, ok, toErrorCode } from './result';
import { dir, isLocale } from './locale';
import { parseEnv, supabasePublicEnv } from './env';

describe('result', () => {
  it('builds ok/err', () => {
    expect(ok(1)).toEqual({ ok: true, data: 1 });
    expect(err('forbidden')).toEqual({ ok: false, error: 'forbidden' });
  });
  it.each([
    ['23505', 'conflict'],
    ['23514', 'validation'],
    ['42501', 'forbidden'],
    ['PGRST116', 'not_found'],
    ['XX000', 'unknown'],
  ] as const)('maps %s → %s', (code, expected) => {
    expect(toErrorCode({ code })).toBe(expected);
  });
  it('maps null to unknown', () => {
    expect(toErrorCode(null)).toBe('unknown');
  });
});

describe('locale', () => {
  it('detects rtl', () => {
    expect(dir('ar')).toBe('rtl');
    expect(dir('fr')).toBe('ltr');
    expect(isLocale('de')).toBe(false);
  });
});

describe('parseEnv', () => {
  it('throws listing every invalid variable, no fallbacks', () => {
    expect(() => parseEnv(supabasePublicEnv, { url: 'nope' }, 'test')).toThrow(/url[\s\S]*anonKey/);
  });
  it('returns parsed values', () => {
    const v = { url: 'http://127.0.0.1:54321', anonKey: 'x'.repeat(30) };
    expect(parseEnv(supabasePublicEnv, v, 'test')).toEqual(v);
  });
});
