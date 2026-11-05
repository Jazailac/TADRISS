import { currentSession, type Session } from '@tadriss/shared';
import { useEffect, useState } from 'react';
import { supabase } from './supabase';

/** Current session claims; `undefined` while loading, `null` when signed out. */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      void currentSession(supabase).then((s) => {
        if (alive) setSession(s);
      });
    };
    refresh();
    const { data } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return session;
}
