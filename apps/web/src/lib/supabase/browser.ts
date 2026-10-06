import { createBrowserClient } from '@supabase/ssr';
import type { Database, TadrissClient } from '@tadriss/shared';
import { env } from '@/env';

let client: TadrissClient | undefined;

/** Browser client (anon key + user session). One instance per tab. */
export function getBrowserClient(): TadrissClient {
  client ??= createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return client;
}
