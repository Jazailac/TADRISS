import { listAuditLog, listPlatformInstitutions, plans } from '@tadriss/shared';
import { Building2, GraduationCap, Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { AuditList } from './audit-list';

/** The platform operator's home: the schools at a glance and the latest activity. */
export async function PlatformOverviewPage() {
  const viewer = await getViewer();
  const supabase = await getServerClient();
  const [t, a, s, schools, audit] = await Promise.all([
    getTranslations('platform'),
    getTranslations('audit'),
    getTranslations('settings.plan.names'),
    listPlatformInstitutions(supabase),
    listAuditLog(supabase, { limit: 8 }),
  ]);

  const list = schools.ok ? schools.data : [];
  const active = list.filter((i) => !i.suspended);
  const students = active.reduce((n, i) => n + i.students, 0);
  const teachers = active.reduce((n, i) => n + i.teachers, 0);
  const stats = [
    { icon: Building2, label: t('overview.schools'), value: active.length },
    { icon: Users, label: t('overview.students'), value: students },
    { icon: GraduationCap, label: t('overview.teachers'), value: teachers },
  ];

  return (
    <div className="mx-auto grid grid-cols-1 max-w-5xl gap-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="display mt-4 text-4xl md:text-5xl">
            {t('overview.greeting', { name: viewer?.profile.firstName ?? '' })}
          </h1>
          <p className="mt-3 max-w-xl text-text-muted">{t('overview.subtitle')}</p>
        </div>
        <ButtonLink href="/admin/institutions" variant="secondary">
          {t('overview.manage')}
        </ButtonLink>
      </header>

      <dl className="grid gap-4 sm:grid-cols-3">
        {stats.map((st) => (
          <Card key={st.label} className="flex items-center gap-4 p-5">
            <span className="grid size-11 place-items-center rounded-lg bg-primary-soft text-primary">
              <st.icon className="size-5" aria-hidden />
            </span>
            <div>
              <dt className="text-sm text-text-muted">{st.label}</dt>
              <dd className="font-mono text-2xl tabular-nums">{st.value}</dd>
            </div>
          </Card>
        ))}
      </dl>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-1">
          <h2 className="font-semibold">{t('overview.plans')}</h2>
          <ul className="mt-4 grid gap-3">
            {plans.map((p) => (
              <li key={p} className="flex items-center justify-between gap-3">
                <Badge tone="primary">{s(p)}</Badge>
                <span className="font-mono tabular-nums">
                  {active.filter((i) => i.plan === p).length}
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <Badge tone="danger">{t('institutions.suspended')}</Badge>
              <span className="font-mono tabular-nums">{list.length - active.length}</span>
            </li>
          </ul>
        </Card>
        <Card className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{t('overview.recent')}</h2>
            <Link href="/admin/audit" className="text-sm text-primary hover:underline">
              {t('overview.allActivity')}
            </Link>
          </div>
          {audit.ok && audit.data.length > 0 ? (
            <AuditList entries={audit.data} showSchool />
          ) : (
            <EmptyState title={a('empty.title')} description={a('empty.body')} />
          )}
        </Card>
      </div>
    </div>
  );
}
