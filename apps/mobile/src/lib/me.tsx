import { getMyProfile, type Locale, type MyProfile } from '@tadriss/shared';
import { Redirect } from 'expo-router';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LoadingState } from '@/ui/kit';
import { useSchoolToday } from './clock';
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
  const today = useSchoolToday(profile?.institution?.timezone ?? 'Africa/Casablanca');

  useEffect(() => {
    if (!session?.role) return;
    void getMyProfile(supabase, session.userId).then((r) => {
      if (r.ok) setProfile(r.data);
      else setFailed(true);
    });
  }, [session?.userId, session?.role]);

  if (session === null || session?.role === null || failed) return <Redirect href="/login" />;
  if (!session || !profile || !session.institutionId) {
    return <LoadingState full />;
  }

  const locale = (['fr', 'ar', 'en'] as const).find((l) => l === i18n.language) ?? 'fr';
  return (
    <MeContext.Provider
      value={{
        userId: session.userId,
        institutionId: session.institutionId,
        profile,
        today,
        locale,
      }}
    >
      {children}
    </MeContext.Provider>
  );
}
