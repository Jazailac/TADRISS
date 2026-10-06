export const locales = ['fr', 'ar', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'fr';
export const rtlLocales: readonly Locale[] = ['ar'];

export const isLocale = (v: unknown): v is Locale =>
  typeof v === 'string' && (locales as readonly string[]).includes(v);

export const dir = (locale: Locale): 'rtl' | 'ltr' => (rtlLocales.includes(locale) ? 'rtl' : 'ltr');

/** BCP-47 tags used for Intl formatting (Moroccan regional variants). */
export const intlLocale: Record<Locale, string> = { fr: 'fr-MA', ar: 'ar-MA', en: 'en-GB' };
