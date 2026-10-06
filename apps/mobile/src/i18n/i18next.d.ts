import type fr from '@/locales/fr.json';

// French is the reference locale: t() keys are type-checked against it.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: { translation: typeof fr };
  }
}
