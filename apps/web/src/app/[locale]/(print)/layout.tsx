import type { ReactNode } from 'react';
import { redirect } from '@/i18n/navigation';
import { getLocale } from 'next-intl/server';
import { getViewer } from '@/lib/viewer';

/** Printable documents live outside the app shell (no sidebar to print), but still need a signed-in user. */
export default async function PrintLayout({ children }: { children: ReactNode }) {
  const [viewer, locale] = await Promise.all([getViewer(), getLocale()]);
  if (!viewer) return redirect({ href: '/login', locale });
  return <div className="min-h-dvh bg-background print:bg-white">{children}</div>;
}
