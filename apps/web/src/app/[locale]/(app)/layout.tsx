import { getLocale, getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/app-shell/app-shell';
import { redirect } from '@/i18n/navigation';
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
  const { firstName, lastName, institution } = viewer.profile;
  return (
    <AppShell
      nav={session.role}
      user={{
        name: `${firstName} ${lastName}`,
        initials: `${firstName.slice(0, 1)}${lastName.slice(0, 1)}`.toUpperCase(),
        role: t(`roles.${session.role}`),
        school: institution?.name ?? t('platform'),
      }}
    >
      {children}
    </AppShell>
  );
}
