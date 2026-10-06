import { describe, expect, it } from 'vitest';
import { resolveLocale } from './resolve';

describe('resolveLocale', () => {
  it.each([
    [['ar-MA'], 'ar'],
    [['fr-FR', 'ar'], 'fr'],
    [['de-DE', 'en-US'], 'en'],
    [['de', 'es'], 'fr'],
    [[], 'fr'],
    [[null, undefined, 'AR'], 'ar'],
    [['ar_MA'], 'ar'],
  ] as const)('%j → %s', (codes, expected) => {
    expect(resolveLocale(codes)).toBe(expected);
  });
});
