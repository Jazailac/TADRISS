import 'server-only';
import { currentSession, getMyProfile, type MyProfile, type Session } from '@tadriss/shared';
import { cache } from 'react';
import { getServerClient } from '@/lib/supabase/server';

export type Viewer = {
  session: Session & { role: NonNullable<Session['role']> };
  profile: MyProfile;
};

/** The signed-in user, memoised per request (layout and page share one lookup). */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await getServerClient();
  const session = await currentSession(supabase);
  if (!session?.role) return null;
  const profile = await getMyProfile(supabase, session.userId);
  if (!profile.ok) return null;
  return { session: { ...session, role: session.role }, profile: profile.data };
});
