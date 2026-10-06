import { locales, type Locale } from '@tadriss/shared';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import i18n, { applyDirection } from '@/i18n';

const schemes = ['light', 'dark', 'system'] as const;
const schemeLabel = {
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
  system: 'settings.themeSystem',
} as const;

export default function Welcome() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colorScheme = scheme.colorScheme;
  const [notice, setNotice] = useState(false);
  const [switching, setSwitching] = useState<Locale | null>(null);

  const changeLocale = async (l: Locale) => {
    setSwitching(l);
    await i18n.changeLanguage(l);
    await applyDirection(l); // reloads the app when direction changes
    setSwitching(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-center gap-6 px-6">
        <Text className="text-3xl font-extrabold text-primary" testID="brand">
          {t('brand')}
        </Text>
        <Text className="text-2xl font-bold text-text">{t('welcome.title')}</Text>
        <Text className="text-base text-text-muted">{t('welcome.subtitle')}</Text>

        <View className="gap-3">
          <Pressable
            testID="login"
            accessibilityRole="button"
            onPress={() => {
              setNotice(true);
            }}
            className="h-12 items-center justify-center rounded-md bg-primary active:opacity-80"
          >
            <Text className="font-semibold text-primary-foreground">{t('welcome.login')}</Text>
          </Pressable>
          <Pressable
            testID="signup"
            accessibilityRole="button"
            onPress={() => {
              setNotice(true);
            }}
            className="h-12 items-center justify-center rounded-md border border-border bg-surface active:opacity-80"
          >
            <Text className="font-semibold text-text">{t('welcome.signup')}</Text>
          </Pressable>
          {notice ? (
            <Text testID="coming-soon" className="text-center text-text-muted">
              {t('welcome.comingSoon')}
            </Text>
          ) : null}
        </View>

        <View className="gap-2">
          <Text className="text-sm font-medium text-text-muted">{t('settings.language')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {locales.map((l) => (
              <Pressable
                key={l}
                testID={`locale-${l}`}
                accessibilityRole="button"
                accessibilityState={{ selected: i18n.language === l, busy: switching === l }}
                disabled={switching !== null}
                onPress={() => void changeLocale(l)}
                className={`h-11 flex-row items-center gap-2 rounded-md border px-4 ${i18n.language === l ? 'border-primary bg-primary-soft' : 'border-border bg-surface'}`}
              >
                {switching === l ? <ActivityIndicator size="small" /> : null}
                <Text className="text-text">{t(`locale.${l}`)}</Text>
              </Pressable>
            ))}
          </View>

          <Text className="mt-2 text-sm font-medium text-text-muted">{t('settings.theme')}</Text>
          <View className="flex-row flex-wrap gap-2">
            {schemes.map((s) => (
              <Pressable
                key={s}
                testID={`theme-${s}`}
                accessibilityRole="button"
                onPress={() => {
                  scheme.setColorScheme(s);
                }}
                className={`h-11 justify-center rounded-md border px-4 ${colorScheme === s ? 'border-primary bg-primary-soft' : 'border-border bg-surface'}`}
              >
                <Text className="text-text">{t(schemeLabel[s])}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
