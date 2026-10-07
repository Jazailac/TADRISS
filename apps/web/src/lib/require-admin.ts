import 'server-only';
import { currentSession, err, ok, type Result, type TadrissClient } from '@tadriss/shared';
import { getServerClient } from '@/lib/supabase/server';

/**
 * Every admin mutation starts here: `getUser()` asks the Auth server (a forged cookie fails),
 * then the role and institution come from the verified claims. RLS is still the real boundary.
 */
export async function requireAdmin(): Promise<
  Result<{ supabase: TadrissClient; institutionId: string }>
> {
  const supabase = await getServerClient();
  const { error } = await supabase.auth.getUser();
  if (error) return err('unauthenticated');
  const session = await currentSession(supabase);
  if (session?.role !== 'institution_admin' || !session.institutionId) return err('forbidden');
  return ok({ supabase, institutionId: session.institutionId });
}
