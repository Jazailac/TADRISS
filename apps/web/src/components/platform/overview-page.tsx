import { listAuditLog, listPlatformInstitutions, plans } from '@tadriss/shared';
import { AlertCircle, Building2, GraduationCap, Users } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { EmptyState } from '../ui/empty-state';
import { Meter } from '../ui/meter';
import { AuditList } from './audit-list';

/** The platform operator's home: the schools at a glance and the latest activity. */
export async function PlatformOverviewPage() {
  const viewer = await getViewer();
  const supabase = await getServerClient();
  const [t, a, s, errors, f, schools, audit] = await Promise.all([
    getTranslations('platform'),
    getTranslations('audit'),
    getTranslations('settings.plan.names'),
    getTranslations('errors'),
    getFormatter(),
    listPlatformInstitutions(supabase),
    listAuditLog(supabase, { limit: 8 }),
  ]);

  const header = (
    <header className="workspace-header flex flex-wrap items-end justify-between gap-5">
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
  );

  if (!schools.ok) {
    return (
      <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-5xl gap-7">
        {header}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href="/admin" variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const list = schools.data;
  const active = list.filter((i) => !i.suspended);
  const students = active.reduce((n, i) => n + i.students, 0);
  const teachers = active.reduce((n, i) => n + i.teachers, 0);
  const stats = [
    { icon: Building2, label: t('overview.schools'), value: active.length },
    { icon: Users, label: t('overview.students'), value: students },
    { icon: GraduationCap, label: t('overview.teachers'), value: teachers },
  ];

  return (
    <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-5xl gap-7">
      {header}

      <dl className="platform-overview-metrics">
        {stats.map((st) => (
          <div key={st.label}>
            <dt>
              <span className="platform-metric-icon">
                <st.icon className="size-5" aria-hidden />
              </span>
              <span>{st.label}</span>
            </dt>
            <dd className="domain-count">{f.number(st.value)}</dd>
          </div>
        ))}
      </dl>

      <div className="platform-operations-layout">
        <section className="platform-plan-panel">
          <h2 className="font-semibold">{t('overview.plans')}</h2>
          <ul className="mt-4 grid gap-3">
            {plans.map((p) => (
              <li key={p} className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <Badge tone="primary">{s(p)}</Badge>
                  <span className="font-mono tabular-nums">
                    {f.number(active.filter((i) => i.plan === p).length)}
                  </span>
                </div>
                {active.length > 0 ? (
                  <Meter
                    value={active.filter((i) => i.plan === p).length}
                    max={active.length}
                    label={s(p)}
                    tone="neutral"
                  />
                ) : null}
              </li>
            ))}
            <li className="flex items-center justify-between gap-3 border-t border-border pt-3">
              <Badge tone="danger">{t('institutions.suspended')}</Badge>
              <span className="font-mono tabular-nums">
                {f.number(list.length - active.length)}
              </span>
            </li>
          </ul>
        </section>
        <section className="platform-activity-panel">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">{t('overview.recent')}</h2>
            <Link href="/admin/audit" className="text-sm text-primary hover:underline">
              {t('overview.allActivity')}
            </Link>
          </div>
          {!audit.ok ? (
            <p
              role="alert"
              className="mt-5 rounded-lg bg-danger-soft p-4 text-sm leading-relaxed text-danger"
            >
              {t('error.body')}
            </p>
          ) : audit.data.length > 0 ? (
            <AuditList entries={audit.data} showSchool />
          ) : (
            <EmptyState title={a('empty.title')} description={a('empty.body')} />
          )}
        </section>
      </div>
    </div>
  );
}
