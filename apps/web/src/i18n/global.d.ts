import type { Locale } from '@tadriss/shared';
import type messages from '../../messages/fr.json';

// French is the reference locale: keys are type-checked against it.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
