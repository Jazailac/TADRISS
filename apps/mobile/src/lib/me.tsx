import { getMyProfile, todayIn, type Locale, type MyProfile } from '@tadriss/shared';
import { Redirect } from 'expo-router';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, View } from 'react-native';
import { useSession } from './session';
import { supabase } from './supabase';

export type Me = {
  userId: string;
  institutionId: string;
  profile: MyProfile;
  /** The school's "today" (`YYYY-MM-DD`), never the phone's. */
  today: string;
  locale: Locale;
};

const MeContext = createContext<Me | null>(null);

/** The signed-in person; every screen under `(app)` can rely on it being present. */
export function useMe(): Me {
  const me = useContext(MeContext);
  if (!me) throw new Error('useMe outside <MeProvider>');
  return me;
}

/** Loads the profile once, sends signed-out people to the login, and provides `useMe()`. */
export function MeProvider({ children }: { children: ReactNode }) {
  const session = useSession();
  const { i18n } = useTranslation();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!session?.role) return;
    void getMyProfile(supabase, session.userId).then((r) => {
      if (r.ok) setProfile(r.data);
      else setFailed(true);
    });
  }, [session?.userId, session?.role]);

  if (session === null || session?.role === null || failed) return <Redirect href="/login" />;
  if (!session || !profile || !session.institutionId) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  const tz = profile.institution?.timezone ?? 'Africa/Casablanca';
  const locale = (['fr', 'ar', 'en'] as const).find((l) => l === i18n.language) ?? 'fr';
  return (
    <MeContext.Provider
      value={{
        userId: session.userId,
        institutionId: session.institutionId,
        profile,
        today: todayIn(tz),
        locale,
      }}
    >
      {children}
    </MeContext.Provider>
  );
}
