import { dir, type Locale } from '@tadriss/shared';
import { getLocales } from 'expo-localization';
import { reloadAppAsync } from 'expo';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';
import ar from '@/locales/ar.json';
import en from '@/locales/en.json';
import fr from '@/locales/fr.json';
import { resolveLocale } from './resolve';

export const resources = {
  fr: { translation: fr },
  ar: { translation: ar },
  en: { translation: en },
} as const;

export const initialLocale: Locale = resolveLocale(getLocales().map((l) => l.languageCode));

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLocale,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
});

/**
 * React Native applies layout direction at startup, so switching between LTR and RTL
 * requires a reload. Call after the user changes language.
 */
export async function applyDirection(locale: Locale): Promise<void> {
  const rtl = dir(locale) === 'rtl';
  I18nManager.allowRTL(true);
  if (I18nManager.isRTL !== rtl) {
    I18nManager.forceRTL(rtl);
    await reloadAppAsync();
  }
}

export default i18n;
