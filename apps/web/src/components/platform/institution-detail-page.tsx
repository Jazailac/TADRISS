import { getPlatformInstitution, listAuditLog } from '@tadriss/shared';
import { ArrowLeft } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { AuditList } from './audit-list';
import { PlanSelect, SuspendButton } from './institution-controls';

export async function InstitutionDetailPage({ id }: { id: string }) {
  const supabase = await getServerClient();
  const [t, a, f, school, audit] = await Promise.all([
    getTranslations('platform'),
    getTranslations('audit'),
    getFormatter(),
    getPlatformInstitution(supabase, id),
    listAuditLog(supabase, { institutionId: id, limit: 20 }),
  ]);
  if (!school.ok) notFound();
  const s = school.data;

  const stats: [string, number][] = [
    [t('detail.students'), s.students],
    [t('detail.teachers'), s.teachers],
    [t('detail.admins'), s.admins],
  ];

  return (
    <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
      <Link
        href="/admin/institutions"
        className="inline-flex w-fit items-center gap-2 text-sm text-text-muted hover:text-primary"
      >
        <ArrowLeft className="rtl-flip size-4" aria-hidden />
        {t('detail.back')}
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {s.suspended ? (
              <Badge tone="danger">{t('institutions.suspended')}</Badge>
            ) : (
              <Badge tone="success">{t('institutions.status.active')}</Badge>
            )}
            <span className="font-mono text-xs text-text-muted">{s.slug}</span>
          </div>
          <h1 className="display mt-4 text-3xl md:text-4xl" dir="auto">
            <bdi>{s.name}</bdi>
          </h1>
          <p className="mt-2 text-sm text-text-muted">
            {t('detail.created', {
              date: f.dateTime(new Date(s.createdAt), { dateStyle: 'long', timeZone: 'UTC' }),
            })}
          </p>
        </div>
        <SuspendButton id={s.id} suspended={s.suspended} />
      </header>

      {s.suspended ? (
        <p role="note" className="rounded-lg bg-warning-soft p-4 text-sm text-warning">
          {t('detail.suspendedNotice')}
        </p>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-semibold">{t('detail.members')}</h2>
          <dl className="mt-4 grid grid-cols-3 gap-4">
            {stats.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs text-text-muted">{label}</dt>
                <dd className="mt-1 font-mono text-2xl tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="p-6">
          <PlanSelect id={s.id} plan={s.plan} />
          <p className="mt-3 text-xs text-text-muted">{t('detail.planHelp')}</p>
        </Card>
      </div>

      <Card className="p-6">
        <h2 className="font-semibold">{a('title')}</h2>
        {audit.ok && audit.data.length > 0 ? (
          <AuditList entries={audit.data} showSchool={false} />
        ) : (
          <EmptyState title={a('empty.title')} description={a('empty.body')} />
        )}
      </Card>
    </div>
  );
}
