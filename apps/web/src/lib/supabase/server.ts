import 'server-only';
import { createServerClient } from '@supabase/ssr';
import type { Database, TadrissClient } from '@tadriss/shared';
import { cookies } from 'next/headers';
import { env } from '@/env';

/** Server Components / Server Actions / Route Handlers. Runs as the signed-in user (RLS applies). */
export async function getServerClient(): Promise<TadrissClient> {
  const store = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (toSet) => {
          try {
            for (const { name, value, options } of toSet) store.set(name, value, options);
          } catch {
            // Called from a Server Component: cookies are read-only there. proxy.ts refreshes them.
          }
        },
      },
    },
  );
}
