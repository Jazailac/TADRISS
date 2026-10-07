import { getMyProfile, signOut, type MyProfile } from '@tadriss/shared';
import { Redirect, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSession } from '@/lib/session';
import { supabase } from '@/lib/supabase';

export default function Home() {
  const { t } = useTranslation();
  const session = useSession();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!session) return;
    void getMyProfile(supabase, session.userId).then((r) => {
      if (r.ok) setProfile(r.data);
      else setFailed(true);
    });
  }, [session]);

  if (session === null || session?.role === null) return <Redirect href="/login" />;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 gap-5 px-6 pb-6 pt-5">
        {failed ? (
          <Text accessibilityRole="alert" className="text-danger">
            {t('errors.unknown')}
          </Text>
        ) : !profile ? (
          <ActivityIndicator />
        ) : (
          <>
            <View className="overflow-hidden rounded-3xl bg-ink p-6">
              <View className="absolute -end-16 -top-20 size-56 rounded-full bg-primary/30" />
              <Text className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {t('brand')}
              </Text>
              <Text
                testID="greeting"
                className="mt-8 text-3xl font-bold leading-10 text-ink-foreground"
              >
                {t('home.greeting', { name: profile.firstName })}
              </Text>
              <Text className="mt-2 text-base text-ink-muted">
                {t(`roles.${profile.role}`)}
                {profile.institution ? ` · ${profile.institution.name}` : ''}
              </Text>
            </View>
            <View className="gap-3 rounded-2xl border border-border bg-surface p-5">
              <Text className="text-base font-semibold text-text">{t('home.comingSoon')}</Text>
              <View className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <View className="h-full w-2/5 rounded-full bg-primary" />
              </View>
            </View>
            <Pressable
              testID="sign-out"
              accessibilityRole="button"
              onPress={() => {
                void signOut(supabase).then(() => {
                  router.replace('/');
                });
              }}
              className="mt-auto h-12 items-center justify-center rounded-md border border-border bg-surface active:opacity-80"
            >
              <Text className="font-semibold text-text">{t('home.signOut')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
