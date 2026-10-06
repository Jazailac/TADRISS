import { defaultLocale, isLocale, type Locale } from '@tadriss/shared';

/**
 * Picks the app locale from the device's preferred languages (most preferred first).
 * The first supported language wins; otherwise French, the product default.
 * `ar-MA`, `ar-EG`… → `ar`; `fr-CA` → `fr`.
 */
export function resolveLocale(deviceLanguageCodes: readonly (string | null | undefined)[]): Locale {
  for (const code of deviceLanguageCodes) {
    const base = code?.toLowerCase().split(/[-_]/)[0];
    if (isLocale(base)) return base;
  }
  return defaultLocale;
}
