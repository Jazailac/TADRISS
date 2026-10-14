import {
  getInstitutionSettings,
  getPlanUsage,
  listDisabledModules,
  type PlanUsage,
} from '@tadriss/shared';
import { AlertCircle, Building2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';
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
  const [t, shell, errors, l, settings, usage, teacherOff, studentOff] = await Promise.all([
    getTranslations('settings'),
    getTranslations('shell.groups'),
    getTranslations('errors'),
    getTranslations('locale'),
    getInstitutionSettings(supabase, institutionId),
    getPlanUsage(supabase),
    listDisabledModules(supabase, 'teacher'),
    listDisabledModules(supabase, 'student'),
  ]);

  const head = (
    <header>
      <p className="eyebrow">{shell('school')}</p>
      <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
      <p className="mt-3 max-w-xl text-text-muted">{t('subtitle')}</p>
    </header>
  );

  if (!settings.ok || !usage.ok || !teacherOff.ok || !studentOff.ok) {
    return (
      <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
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
    [t('profile.fields.name'), s.name],
    [t('profile.fields.defaultLocale'), l(s.defaultLocale)],
    [t('profile.fields.timezone'), s.timezone],
    [t('profile.fields.phone'), s.phone],
    [t('profile.fields.city'), s.city],
    [t('profile.fields.address'), s.address],
  ];

  return (
    <div className="mx-auto grid grid-cols-1 max-w-4xl gap-7">
      {head}

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Building2 className="size-4 text-primary" aria-hidden />
            {t('profile.title')}
          </h2>
          <EditSchoolButton settings={s} />
        </div>
        <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-xs text-text-muted">{label}</dt>
              <dd className="mt-0.5 truncate font-medium" dir="auto">
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

      <Card className="p-6">
        <h2 className="font-semibold">{t('modules.title')}</h2>
        <p className="mt-1 text-sm text-text-muted">{t('modules.body')}</p>
        <div className="mt-5 grid gap-8 md:grid-cols-2">
          {(['teacher', 'student'] as const).map((role) => (
            <section key={role} aria-labelledby={`modules-${role}`}>
              <h3 id={`modules-${role}`} className="eyebrow">
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
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">{t('plan.title')}</h2>
        <Badge tone="primary">{t(`plan.names.${usage.plan}`)}</Badge>
      </div>
      <p className="mt-1 text-sm text-text-muted">{t('plan.body')}</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        {seat('students')}
        {seat('teachers')}
      </div>
    </Card>
  );
}
