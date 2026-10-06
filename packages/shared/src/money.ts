import { intlLocale, type Locale } from './locale';

export const CURRENCY = 'MAD';

/**
 * Amounts are stored and computed as integer centimes (1 MAD = 100 centimes) to avoid
 * floating-point error. Convert only for display. See docs/decisions/0004.
 */
export function formatMoney(centimes: number, locale: Locale): string {
  if (!Number.isInteger(centimes)) throw new RangeError('amount must be integer centimes');
  return new Intl.NumberFormat(intlLocale[locale], {
    style: 'currency',
    currency: CURRENCY,
    minimumFractionDigits: 2,
  }).format(centimes / 100);
}

/** Parses user input like "1 250,50" / "1250.5" into centimes. Returns null when invalid. */
export function parseMoney(input: string): number | null {
  const s = input.replace(/[\s\u00a0\u202f]/g, '').replace(/MAD|DH|د\.م\./gi, '');
  if (!/^\d+([.,]\d{1,2})?$/.test(s)) return null;
  const [whole = '0', frac = ''] = s.split(/[.,]/);
  return Number(whole) * 100 + Number(frac.padEnd(2, '0'));
}
