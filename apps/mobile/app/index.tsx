import { locales, type Locale } from '@tadriss/shared';
import { Redirect, router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { env } from '@/env';
import i18n, { applyDirection } from '@/i18n';
import { useSession } from '@/lib/session';

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
  const [switching, setSwitching] = useState<Locale | null>(null);
  const session = useSession();

  const changeLocale = async (l: Locale) => {
    setSwitching(l);
    await i18n.changeLanguage(l);
    await applyDirection(l); // reloads the app when direction changes
    setSwitching(null);
  };

  // Signed-in users go straight to their home.
  if (session?.role) return <Redirect href="/home" />;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 gap-6 px-6 pb-6 pt-4">
        <View className="min-h-[18rem] justify-between overflow-hidden rounded-3xl bg-ink p-6">
          <View className="absolute -end-16 -top-16 size-56 rounded-full bg-primary/30" />
          <View className="absolute -bottom-24 -start-20 size-64 rounded-full bg-accent/20" />
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-ink-foreground" testID="brand">
              {t('brand')}
            </Text>
            <View className="size-10 items-center justify-center rounded-2xl bg-primary">
              <Text className="text-lg font-bold text-primary-foreground">
                {t('brand').charAt(0)}
              </Text>
            </View>
          </View>
          <View className="gap-3">
            <Text className="text-3xl font-bold leading-10 text-ink-foreground">
              {t('welcome.title')}
            </Text>
            <Text className="text-base leading-6 text-ink-muted">{t('welcome.subtitle')}</Text>
          </View>
        </View>

        <View className="gap-3">
          <Pressable
            testID="login"
            accessibilityRole="button"
            onPress={() => {
              router.push('/login');
            }}
            className="h-12 items-center justify-center rounded-md bg-primary active:opacity-80"
          >
            <Text className="font-semibold text-primary-foreground">{t('welcome.login')}</Text>
          </Pressable>
          <Pressable
            testID="signup"
            accessibilityRole="link"
            // School sign-up is a web flow; the app is for daily use.
            onPress={() => void Linking.openURL(`${env.EXPO_PUBLIC_APP_URL}/signup`)}
            className="h-12 items-center justify-center rounded-md border border-border bg-surface active:opacity-80"
          >
            <Text className="font-semibold text-text">{t('welcome.signup')}</Text>
          </Pressable>
        </View>

        <View className="gap-2 rounded-2xl border border-border bg-surface p-4">
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
