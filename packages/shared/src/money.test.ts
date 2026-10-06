import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoney } from './money';

const norm = (s: string) => s.replace(/[\u00a0\u202f]/g, ' ');

describe('formatMoney', () => {
  it('formats centimes in MAD per locale', () => {
    // fr-MA (CLDR) groups with a dot: "1.250,50 MAD"
    expect(norm(formatMoney(125050, 'fr'))).toMatch(/1[. ]250,50/);
    expect(formatMoney(125050, 'en')).toMatch(/1,250\.50/);
    expect(formatMoney(0, 'ar')).toBeTypeOf('string');
  });
  it('rejects non-integer amounts', () => {
    expect(() => formatMoney(10.5, 'fr')).toThrow(RangeError);
  });
});

describe('parseMoney', () => {
  it.each([
    ['1250', 125000],
    ['1250,5', 125050],
    ['1 250,50', 125050],
    ['1250.05', 125005],
    ['300 DH', 30000],
    ['0', 0],
  ])('%s → %i', (input, expected) => {
    expect(parseMoney(input)).toBe(expected);
  });

  it.each(['', 'abc', '-5', '1.234', '1,2,3'])('rejects %j', (input) => {
    expect(parseMoney(input)).toBeNull();
  });
});
