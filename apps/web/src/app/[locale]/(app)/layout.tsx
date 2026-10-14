import { getUnreadCounts } from '@tadriss/shared';
import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell/app-shell';
import { ToastProvider } from '@/components/ui/toast';
import { redirect } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getDisabledModules } from '@/lib/modules';
import { getViewer } from '@/lib/viewer';

/**
 * Every authenticated area. proxy.ts already routes by role; this re-checks on the server
 * (defense in depth) and loads the real profile for the shell.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [viewer, locale, t] = await Promise.all([
    getViewer(),
    getLocale(),
    getTranslations('shell'),
  ]);
  if (!viewer) return redirect({ href: '/login', locale });

  const { session } = viewer;
  // Super admins have no school and no inbox.
  const unread =
    session.role === 'super_admin'
      ? { announcements: 0, messages: 0 }
      : await getUnreadCounts(await getServerClient());
  const { firstName, lastName, institution } = viewer.profile;
  return (
    <ToastProvider>
      <AppShell
        nav={session.role}
        unread={unread}
        hidden={await getDisabledModules()}
        user={{
          name: `${firstName} ${lastName}`,
          initials: `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase(),
          role: t(`roles.${session.role}`),
          school: institution?.name ?? t('platform'),
        }}
      >
        {children}
      </AppShell>
    </ToastProvider>
  );
}
