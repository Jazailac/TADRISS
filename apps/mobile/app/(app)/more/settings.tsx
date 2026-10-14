import { locales, signOut, type Locale } from '@tadriss/shared';
import { router } from 'expo-router';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import i18n, { applyDirection } from '@/i18n';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Button, Card, Muted, Screen, SectionTitle } from '@/ui/kit';

const schemes = ['light', 'dark', 'system'] as const;
const schemeLabel = {
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
  system: 'settings.themeSystem',
} as const;

export default function Settings() {
  const { t } = useTranslation();
  const me = useMe();
  const scheme = useColorScheme();
  const colorScheme = scheme.colorScheme;
  const displayName = `${me.profile.firstName} ${me.profile.lastName}`;
  const [switching, setSwitching] = useState<Locale | null>(null);

  const changeLocale = async (l: Locale) => {
    setSwitching(l);
    await i18n.changeLanguage(l);
    await applyDirection(l); // reloads the app when the direction changes
    setSwitching(null);
  };

  return (
    <Screen title={t('more.settings')}>
      <Button
        variant="secondary"
        label={t('common.back')}
        onPress={() => {
          router.back();
        }}
      />
      <Card>
        <Text className="text-base font-semibold text-text">{displayName}</Text>
        <Muted>{t(`roles.${me.profile.role}`)}</Muted>
      </Card>
      <View className="gap-2">
        <SectionTitle>{t('settings.language')}</SectionTitle>
        <View className="flex-row gap-2">
          {locales.map((l) => (
            <Pressable
              key={l}
              accessibilityRole="button"
              accessibilityState={{ selected: l === me.locale, busy: switching === l }}
              onPress={() => {
                void changeLocale(l);
              }}
              className={`flex-1 items-center rounded-md py-3 ${
                l === me.locale ? 'bg-primary' : 'bg-surface-muted'
              }`}
            >
              <Text
                className={`font-semibold ${l === me.locale ? 'text-primary-foreground' : 'text-text'}`}
              >
                {t(`locale.${l}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View className="gap-2">
        <SectionTitle>{t('settings.theme')}</SectionTitle>
        <View className="flex-row gap-2">
          {schemes.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityState={{ selected: s === colorScheme }}
              onPress={() => {
                scheme.setColorScheme(s);
              }}
              className={`flex-1 items-center rounded-md py-3 ${
                s === colorScheme ? 'bg-primary' : 'bg-surface-muted'
              }`}
            >
              <Text
                className={`font-semibold ${s === colorScheme ? 'text-primary-foreground' : 'text-text'}`}
              >
                {t(schemeLabel[s])}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <Button
        label={t('home.signOut')}
        onPress={() => {
          void signOut(supabase).then(() => {
            router.replace('/');
          });
        }}
      />
    </Screen>
  );
}
