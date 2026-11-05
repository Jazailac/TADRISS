import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/app-shell/app-shell';
import { Catalogue } from '@/components/demo/catalogue';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Dev/preview-only design reference: the app shell, module catalogue and state examples. */
export default function DesignPage() {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview') notFound();
  const t = useTranslations('demo.user');
  return (
    <AppShell
      nav="institution_admin"
      user={{ name: t('name'), initials: t('initials'), role: t('role'), school: t('school') }}
    >
      <Catalogue />
    </AppShell>
  );
}
