import 'server-only';
import { listChildren, type Child } from '@tadriss/shared';
import { cache } from 'react';
import { getServerClient } from '@/lib/supabase/server';

/** The signed-in parent's children (memoised per request). Empty when none are linked yet. */
export const getChildren = cache(async (): Promise<Child[]> => {
  const res = await listChildren(await getServerClient());
  return res.ok ? res.data : [];
});

/** The child a `?child=` parameter names, else the first one. */
export function pickChild(children: Child[], param?: string): Child | null {
  return children.find((c) => c.id === param) ?? children[0] ?? null;
}
