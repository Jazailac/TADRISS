import { defaultLocale, locales } from '@tadriss/shared';
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: 'as-needed',
  // French is the product default: `/` is always French, never guessed from Accept-Language.
  // Users pick ar/en explicitly (locale switcher → /ar, /en). See docs/decisions/0005.
  localeDetection: false,
});
