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
      <View className="flex-1 justify-center gap-4 px-6">
        {failed ? (
          <Text accessibilityRole="alert" className="text-danger">
            {t('errors.unknown')}
          </Text>
        ) : !profile ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text testID="greeting" className="text-3xl font-bold text-text">
              {t('home.greeting', { name: profile.firstName })}
            </Text>
            <Text className="text-base text-text-muted">
              {t(`roles.${profile.role}`)}
              {profile.institution ? ` · ${profile.institution.name}` : ''}
            </Text>
            <Text className="text-base text-text-muted">{t('home.comingSoon')}</Text>
            <Pressable
              testID="sign-out"
              accessibilityRole="button"
              onPress={() => {
                void signOut(supabase).then(() => {
                  router.replace('/');
                });
              }}
              className="mt-4 h-12 items-center justify-center rounded-md border border-border bg-surface active:opacity-80"
            >
              <Text className="font-semibold text-text">{t('home.signOut')}</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
