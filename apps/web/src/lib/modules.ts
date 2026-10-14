import 'server-only';
import { listDisabledModules, type ModuleKey } from '@tadriss/shared';
import { cache } from 'react';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';

/**
 * Modules the administration switched off for the viewer's role (memoised per request: the layout
 * and the module gate share one lookup). Administrators and the platform are never restricted.
 */
export const getDisabledModules = cache(async (): Promise<ModuleKey[]> => {
  const viewer = await getViewer();
  const role = viewer?.session.role;
  if (role !== 'teacher' && role !== 'student') return [];
  const res = await listDisabledModules(await getServerClient(), role);
  return res.ok ? res.data : [];
});
