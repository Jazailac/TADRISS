import type { Locale } from '@tadriss/shared';
import type { Messages } from './messages';

// French is the reference locale: keys are type-checked against it.
declare module 'next-intl' {
  interface AppConfig {
    Locale: Locale;
    Messages: Messages;
  }
}
