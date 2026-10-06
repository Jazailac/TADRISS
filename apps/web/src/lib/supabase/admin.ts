import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database, TadrissClient } from '@tadriss/shared';
import { env } from '@/env';
import { serverEnv } from '@/env.server';

/**
 * Service-role client: BYPASSES RLS. Server-only. Use only where a documented flow
 * requires it (e.g. invitations), never for regular reads/writes.
 */
export function getAdminClient(): TadrissClient {
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
