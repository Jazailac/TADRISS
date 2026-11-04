import { locales, signOut, type ErrorCode, type Locale } from '@tadriss/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import i18n, { applyDirection } from '@/i18n';
import { useMe } from '@/lib/me';
import { useAppearance } from '@/lib/appearance';
import { supabase } from '@/lib/supabase';
import { Avatar, Button, Card, ErrorBox, Muted, Pill, Screen, SectionTitle } from '@/ui/kit';

const schemes = ['light', 'dark', 'system'] as const;
const schemeLabel = {
  light: 'settings.themeLight',
  dark: 'settings.themeDark',
  system: 'settings.themeSystem',
} as const;

export default function Settings() {
  const { t } = useTranslation();
  const me = useMe();
  const appearance = useAppearance();
  const displayName = `${me.profile.firstName} ${me.profile.lastName}`;
  const [switching, setSwitching] = useState<Locale | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<ErrorCode | null>(null);

  const changeLocale = async (l: Locale) => {
    if (switching) return;
    setSwitching(l);
    await i18n.changeLanguage(l);
    await applyDirection(l); // reloads the app when the direction changes
    setSwitching(null);
  };

  const leave = async () => {
    if (leaving) return;
    setLeaving(true);
    setError(null);
    const result = await signOut(supabase);
    if (result.ok) router.replace('/');
    else setError(result.error);
    setLeaving(false);
  };

  return (
    <Screen title={t('more.settings')} subtitle={t('design.preferences')} icon="settings" back>
      <Card>
        <View className="flex-row items-center gap-4">
          <Avatar name={displayName} large />
          <View className="flex-1 gap-2">
            <Text className="text-lg font-semibold leading-6 tracking-[-0.3px] text-text">
              {displayName}
            </Text>
            <Pill tone="primary">{t(`roles.${me.profile.role}`)}</Pill>
          </View>
        </View>
        <View className="gap-1 border-t border-border pt-4">
          {me.profile.institution?.name ? (
            <Text className="text-sm font-medium text-text">{me.profile.institution.name}</Text>
          ) : null}
          <Muted>{t('design.securityNote')}</Muted>
        </View>
      </Card>
      <View className="gap-4">
        <View className="gap-1.5">
          <SectionTitle>{t('settings.language')}</SectionTitle>
          <Muted>{t('design.languageHint')}</Muted>
        </View>
        <View className="flex-row gap-2">
          {locales.map((l) => (
            <Pressable
              key={l}
              accessibilityRole="button"
              accessibilityState={{
                selected: l === me.locale,
                busy: switching === l,
                disabled: switching !== null,
              }}
              disabled={switching !== null}
              onPress={() => {
                void changeLocale(l);
              }}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              className={`min-h-14 flex-1 flex-row items-center justify-center gap-2 rounded-xl border px-2 py-3 ${
                l === me.locale ? 'border-primary/30 bg-primary-soft' : 'border-border bg-surface'
              }`}
            >
              {switching === l ? <ActivityIndicator size="small" /> : null}
              <Text
                className={`text-sm font-semibold ${l === me.locale ? 'text-primary' : 'text-text-muted'}`}
              >
                {t(`locale.${l}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View className="gap-4">
        <View className="gap-1.5">
          <SectionTitle>{t('settings.theme')}</SectionTitle>
          <Muted>{t('design.themeHint')}</Muted>
        </View>
        <View className="flex-row gap-2">
          {schemes.map((s) => (
            <Pressable
              key={s}
              accessibilityRole="button"
              accessibilityState={{ selected: s === appearance.preference }}
              onPress={() => {
                appearance.select(s);
              }}
              style={({ pressed }) => ({
                transform: [{ scale: pressed && appearance.motionAllowed ? 0.97 : 1 }],
              })}
              className={`flex-1 items-center gap-3 rounded-2xl border px-2 py-4 ${
                s === appearance.preference
                  ? 'border-primary bg-primary-soft'
                  : 'border-border bg-surface'
              }`}
            >
              <View
                accessible={false}
                className={`h-16 w-full max-w-20 overflow-hidden rounded-lg border border-border ${s === 'dark' ? 'bg-ink' : 'bg-background'}`}
              >
                {s === 'system' ? (
                  <View className="absolute bottom-0 end-0 top-0 w-1/2 bg-ink" />
                ) : null}
                <View
                  className={`ms-2 mt-2 h-1.5 w-4 rounded-full ${s === 'dark' ? 'bg-ink-muted' : 'bg-primary'}`}
                />
                <View
                  className={`ms-2 mt-2 h-5 w-8 rounded border ${s === 'dark' ? 'border-ink-foreground/20 bg-ink-foreground/10' : 'border-border bg-surface'}`}
                />
                <View
                  className={`ms-2 mt-2 h-1 w-5 rounded-full ${s === 'dark' ? 'bg-ink-muted' : 'bg-border-strong'}`}
                />
              </View>
              <Text
                className={`text-sm font-semibold ${s === appearance.preference ? 'text-primary' : 'text-text-muted'}`}
              >
                {t(schemeLabel[s])}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View className="gap-4 border-t border-border pt-6">
        {error ? <ErrorBox code={error} /> : null}
        <Button
          testID="sign-out"
          variant="secondary"
          label={t('home.signOut')}
          pending={leaving}
          onPress={() => {
            void leave();
          }}
        />
      </View>
    </Screen>
  );
}
