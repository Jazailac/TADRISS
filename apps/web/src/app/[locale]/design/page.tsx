import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/app-shell/app-shell';
import { DashboardPreview } from '@/components/demo/dashboard-preview';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Dev/preview-only design reference: the app shell + a sample admin dashboard. */
export default function DesignPage() {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview') notFound();
  const t = useTranslations('demo.user');
  return (
    <AppShell
      nav="admin"
      activeHref="/dashboard"
      user={{ name: t('name'), initials: t('initials'), role: t('role'), school: t('school') }}
    >
      <DashboardPreview />
    </AppShell>
  );
}
