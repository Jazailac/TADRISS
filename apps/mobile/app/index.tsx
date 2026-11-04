import { locales, type Locale } from '@tadriss/shared';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { env } from '@/env';
import i18n, { applyDirection } from '@/i18n';
import { useSession } from '@/lib/session';
import { useAppearance } from '@/lib/appearance';
import { BrandMark, Button, Icon } from '@/ui/kit';

const schemes = ['light', 'dark', 'system'] as const;
const schemeLabel = {
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
  system: 'settings.themeSystem',
} as const;

export default function Welcome() {
  const { t } = useTranslation();
  const appearance = useAppearance();
  const [switching, setSwitching] = useState<Locale | null>(null);
  const session = useSession();

  const changeLocale = async (l: Locale) => {
    setSwitching(l);
    await i18n.changeLanguage(l);
    await applyDirection(l);
    setSwitching(null);
  };

  if (session?.role) return <Redirect href="/home" />;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="mx-auto w-full max-w-[560px] gap-7 px-6 pb-8 pt-5"
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <BrandMark compact />
            <Text className="text-xl font-semibold tracking-[-0.5px] text-text" testID="brand">
              {t('brand')}
            </Text>
          </View>
          <Text className="text-[13px] font-medium uppercase tracking-[1.5px] text-text-muted">
            {t('design.schoolSpace')}
          </Text>
        </View>

        <View className="overflow-hidden rounded-3xl bg-ink px-6 pb-7 pt-6">
          <View accessible={false} className="h-44 items-center overflow-hidden">
            <View className="absolute bottom-0 h-40 w-56 rounded-t-full border border-ink-foreground/20" />
            <View className="absolute -start-4 bottom-0 h-32 w-24 rounded-t-full bg-accent" />
            <View className="absolute bottom-0 h-40 w-32 items-center justify-end rounded-t-full bg-primary">
              <View className="h-28 w-20 rounded-t-full bg-ink" />
            </View>
            <View className="absolute -end-3 bottom-0 h-24 w-20 rounded-t-full border border-ink-foreground/30 bg-ink" />
            <View className="absolute end-8 top-0 size-8 rounded-full bg-accent-soft" />
            <View className="absolute bottom-0 h-px w-full bg-ink-foreground/20" />
          </View>
          <View className="gap-4 pt-6">
            <Text className="text-[13px] font-semibold uppercase tracking-[1.5px] text-ink-muted">
              {t('design.welcomeEyebrow')}
            </Text>
            <Text
              className="text-[35px] leading-[42px] tracking-[-0.8px] text-ink-foreground"
              style={
                i18n.language === 'ar'
                  ? undefined
                  : { fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' }
              }
            >
              {t('welcome.title')}
            </Text>
            <Text className="text-base leading-6 text-ink-muted">{t('welcome.subtitle')}</Text>
          </View>
        </View>

        <View className="flex-row gap-3">
          {(['schedule', 'homework', 'messages'] as const).map((name) => (
            <View key={name} className="flex-1 items-center gap-2.5">
              <View className="size-10 items-center justify-center rounded-xl border border-border bg-surface">
                <Icon name={name} active />
              </View>
              <Text className="text-[13px] text-text-muted">{t(`tabs.${name}`)}</Text>
            </View>
          ))}
        </View>
        <View className="gap-3">
          <Button
            testID="login"
            label={t('welcome.login')}
            onPress={() => {
              router.push('/login');
            }}
          />
          <Button
            testID="signup"
            variant="secondary"
            label={t('welcome.signup')}
            onPress={() => {
              void Linking.openURL(`${env.EXPO_PUBLIC_APP_URL}/signup`);
            }}
          />
        </View>

        <View className="gap-5 border-t border-border pt-6">
          <View className="gap-2.5">
            <Text className="text-[13px] font-semibold uppercase tracking-[1.5px] text-text-muted">
              {t('settings.language')}
            </Text>
            <View className="flex-row gap-2">
              {locales.map((l) => (
                <Pressable
                  key={l}
                  testID={`locale-${l}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: i18n.language === l, busy: switching === l }}
                  disabled={switching !== null}
                  onPress={() => {
                    void changeLocale(l);
                  }}
                  className={`min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl border px-2 ${i18n.language === l ? 'border-primary/30 bg-primary-soft' : 'border-border bg-surface'}`}
                >
                  {switching === l ? <ActivityIndicator size="small" /> : null}
                  <Text
                    className={`text-sm font-medium ${i18n.language === l ? 'text-primary' : 'text-text-muted'}`}
                  >
                    {t(`locale.${l}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          <View className="gap-2.5">
            <Text className="text-[13px] font-semibold uppercase tracking-[1.5px] text-text-muted">
              {t('settings.theme')}
            </Text>
            <View className="flex-row rounded-xl bg-surface-muted p-1">
              {schemes.map((s) => (
                <Pressable
                  key={s}
                  testID={`theme-${s}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: appearance.preference === s }}
                  onPress={() => {
                    appearance.select(s);
                  }}
                  className={`min-h-11 flex-1 items-center justify-center rounded-lg px-2 ${appearance.preference === s ? 'bg-surface' : ''}`}
                >
                  <Text
                    className={`text-sm font-medium ${appearance.preference === s ? 'text-text' : 'text-text-muted'}`}
                  >
                    {t(schemeLabel[s])}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
        <Text className="text-center text-sm leading-5 text-text-muted">
          {t('design.welcomeFooter')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
