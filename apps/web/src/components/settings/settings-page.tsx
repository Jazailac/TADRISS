import {
  getInstitutionSettings,
  getPlanUsage,
  listAuditLog,
  listDisabledModules,
  type PlanUsage,
} from '@tadriss/shared';
import { Activity, AlertCircle, Building2, SlidersHorizontal } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
import { AuditList } from '../platform/audit-list';
import { Badge } from '../ui/badge';
import { ButtonLink } from '../ui/button';
import { Card } from '../ui/card';
import { Meter } from '../ui/meter';
import { ModuleAccessList } from './module-access';
import { EditSchoolButton } from './settings-dialogs';

export async function SettingsPage() {
  const viewer = await getViewer();
  const institutionId = viewer?.profile.institution?.id ?? '';
  const supabase = await getServerClient();
  const [t, d, shell, errors, l, settings, usage, teacherOff, studentOff, audit] =
    await Promise.all([
      getTranslations('settings'),
      getTranslations('domain'),
      getTranslations('shell.groups'),
      getTranslations('errors'),
      getTranslations('locale'),
      getInstitutionSettings(supabase, institutionId),
      getPlanUsage(supabase),
      listDisabledModules(supabase, 'teacher'),
      listDisabledModules(supabase, 'student'),
      listAuditLog(supabase, { limit: 15 }),
    ]);

  const head = (
    <header className="workspace-header">
      <p className="eyebrow">{shell('school')}</p>
      <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
      <p className="mt-3 max-w-xl text-text-muted">{t('subtitle')}</p>
    </header>
  );

  if (!settings.ok || !usage.ok || !teacherOff.ok || !studentOff.ok) {
    return (
      <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-4xl gap-7">
        {head}
        <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger">
            <AlertCircle className="size-5" aria-hidden />
          </span>
          <h2 className="display text-2xl">{t('error.title')}</h2>
          <p className="max-w-md text-sm text-text-muted">{t('error.body')}</p>
          <ButtonLink href="/dashboard/settings" variant="secondary" className="mt-2">
            {errors('retry')}
          </ButtonLink>
        </Card>
      </div>
    );
  }

  const s = settings.data;
  const rows: [string, string | null][] = [
    [t('profile.fields.defaultLocale'), l(s.defaultLocale)],
    [t('profile.fields.timezone'), s.timezone],
    [t('profile.fields.phone'), s.phone],
    [t('profile.fields.city'), s.city],
    [t('profile.fields.address'), s.address],
  ];

  return (
    <div className="workspace-page w-full mx-auto grid grid-cols-1 max-w-6xl gap-7">
      {head}

      <div className="settings-layout">
        <nav className="settings-section-nav" aria-label={d('controlCenter')}>
          {[
            ['settings-profile', t('profile.title')],
            ['settings-plan', t('plan.title')],
            ['settings-modules', t('modules.title')],
            ['settings-activity', t('activity.title')],
          ].map(([id, label], index) => (
            <a key={id} href={`#${id}`}>
              <span aria-hidden>{index + 1}</span>
              {label}
            </a>
          ))}
        </nav>
        <div className="settings-content">
          <div className="grid gap-5 xl:grid-cols-2">
            <Card id="settings-profile" className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="flex items-center gap-2 font-semibold">
                  <Building2 className="size-4 text-primary" aria-hidden />
                  {t('profile.title')}
                </h2>
                <EditSchoolButton settings={s} />
              </div>
              <p className="settings-school-name display mt-7 break-words leading-tight" dir="auto">
                <bdi>{s.name}</bdi>
              </p>
              <dl className="mt-6 grid gap-x-8 sm:grid-cols-2">
                {rows.map(([label, value]) => (
                  <div key={label} className="min-w-0 border-t border-border py-4">
                    <dt className="text-xs text-text-muted">{label}</dt>
                    <dd className="mt-1 break-words text-sm font-medium" dir="auto">
                      {value ? (
                        <bdi>{value}</bdi>
                      ) : (
                        <span className="text-text-muted">{t('profile.empty')}</span>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>

            <PlanCard usage={usage.data} t={t} />
          </div>

          <Card id="settings-modules" className="p-6 sm:p-8">
            <div className="settings-control-heading">
              <span>
                <SlidersHorizontal className="size-5" aria-hidden />
              </span>
              <div>
                <h2>{t('modules.title')}</h2>
                <p className="mt-2 text-xs leading-relaxed text-text-muted">{t('modules.body')}</p>
              </div>
            </div>
            <div className="mt-7 grid gap-6 md:grid-cols-2">
              {(['teacher', 'student'] as const).map((role) => (
                <section
                  key={role}
                  aria-labelledby={`modules-${role}`}
                  className="rounded-xl border border-border px-5"
                >
                  <h3 id={`modules-${role}`} className="eyebrow border-b border-border py-4">
                    {t(`modules.roles.${role}`)}
                  </h3>
                  <ModuleAccessList
                    role={role}
                    disabled={role === 'teacher' ? teacherOff.data : studentOff.data}
                  />
                </section>
              ))}
            </div>
          </Card>

          <Card id="settings-activity" className="p-6 sm:p-8">
            <div className="settings-control-heading">
              <span>
                <Activity className="size-5" aria-hidden />
              </span>
              <div>
                <h2>{t('activity.title')}</h2>
                <p className="mt-2 text-xs leading-relaxed text-text-muted">{t('activity.body')}</p>
              </div>
            </div>
            {!audit.ok ? (
              <p role="alert" className="mt-4 rounded-lg bg-danger-soft p-4 text-sm text-danger">
                {t('error.body')}
              </p>
            ) : audit.data.length > 0 ? (
              <AuditList
                entries={audit.data}
                showSchool={false}
                timeZone={viewer?.profile.institution?.timezone}
              />
            ) : (
              <p className="mt-4 text-sm text-text-muted">{t('activity.empty')}</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function PlanCard({
  usage,
  t,
}: {
  usage: PlanUsage;
  t: Awaited<ReturnType<typeof getTranslations<'settings'>>>;
}) {
  const seat = (kind: 'students' | 'teachers') => {
    const { used, limit } = usage[kind];
    return (
      <div key={kind}>
        <div className="flex items-baseline justify-between gap-3 text-sm">
          <span className="font-medium">{t(`plan.${kind}`)}</span>
          <span className="font-mono tabular-nums text-text-muted">
            {limit === null ? t('plan.unlimited', { used }) : t('plan.usage', { used, limit })}
          </span>
        </div>
        {limit !== null ? (
          <Meter value={used} max={limit} label={t(`plan.${kind}`)} className="mt-2" />
        ) : null}
      </div>
    );
  };
  return (
    <Card
      id="settings-plan"
      className="flex flex-col border-primary/15 bg-primary-soft/30 p-6 sm:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{t('plan.title')}</h2>
        <Badge tone="primary">{t(`plan.names.${usage.plan}`)}</Badge>
      </div>
      <p className="mt-1 text-sm text-text-muted">{t('plan.body')}</p>
      <div className="mt-auto grid gap-7 pt-8">
        {seat('students')}
        {seat('teachers')}
      </div>
    </Card>
  );
}
