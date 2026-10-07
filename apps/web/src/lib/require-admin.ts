import 'server-only';
import {
  currentSession,
  err,
  ok,
  type Result,
  type Role,
  type TadrissClient,
} from '@tadriss/shared';
import { getServerClient } from '@/lib/supabase/server';

export type Actor = {
  supabase: TadrissClient;
  userId: string;
  role: Role;
  institutionId: string;
};

/**
 * Every mutation starts here: `getUser()` asks the Auth server (a forged cookie fails), then the
 * role and institution come from the verified claims. RLS is still the real boundary.
 */
export async function requireRole(roles: readonly Role[]): Promise<Result<Actor>> {
  const supabase = await getServerClient();
  const { error } = await supabase.auth.getUser();
  if (error) return err('unauthenticated');
  const session = await currentSession(supabase);
  if (!session?.role || !roles.includes(session.role) || !session.institutionId)
    return err('forbidden');
  return ok({
    supabase,
    userId: session.userId,
    role: session.role,
    institutionId: session.institutionId,
  });
}

export async function requireAdmin(): Promise<
  Result<{ supabase: TadrissClient; institutionId: string }>
> {
  const actor = await requireRole(['institution_admin']);
  return actor.ok
    ? ok({ supabase: actor.data.supabase, institutionId: actor.data.institutionId })
    : actor;
}
