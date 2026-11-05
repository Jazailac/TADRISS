import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { AppShell } from '@/components/app-shell/app-shell';
import { Welcome } from '@/components/home/welcome';

const roles = ['institution_admin', 'teacher', 'student', 'super_admin'] as const;

export default async function RolePreview({ params }: { params: Promise<{ role: string }> }) {
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview') notFound();
  const { role } = await params;
  const selected = roles.find((item) => item === role);
  if (!selected) notFound();

  const key =
    selected === 'institution_admin'
      ? 'admin'
      : selected === 'super_admin'
        ? 'superAdmin'
        : selected;
  const [t, u, s] = await Promise.all([
    getTranslations('app'),
    getTranslations('demo.user'),
    getTranslations('shell.roles'),
  ]);
  const stepKeys =
    key === 'admin'
      ? (['account', 'team', 'classes'] as const)
      : key === 'teacher'
        ? (['account', 'classes', 'attendance'] as const)
        : key === 'student'
          ? (['account', 'schedule', 'grades'] as const)
          : (['account', 'institutions', 'audit'] as const);
  const stepMessages: Record<string, { label: string; detail: string }> = {
    account: {
      label: t(`${key}.steps.account.label` as never),
      detail: t(`${key}.steps.account.detail` as never),
    },
    team: {
      label: t(`${key}.steps.team.label` as never),
      detail: t(`${key}.steps.team.detail` as never),
    },
    classes: {
      label: t(`${key}.steps.classes.label` as never),
      detail: t(`${key}.steps.classes.detail` as never),
    },
    attendance: {
      label: t(`${key}.steps.attendance.label` as never),
      detail: t(`${key}.steps.attendance.detail` as never),
    },
    schedule: {
      label: t(`${key}.steps.schedule.label` as never),
      detail: t(`${key}.steps.schedule.detail` as never),
    },
    grades: {
      label: t(`${key}.steps.grades.label` as never),
      detail: t(`${key}.steps.grades.detail` as never),
    },
    institutions: {
      label: t('superAdmin.steps.institutions.label'),
      detail: t('superAdmin.steps.institutions.detail'),
    },
    audit: { label: t('superAdmin.steps.audit.label'), detail: t('superAdmin.steps.audit.detail') },
  };
  const steps = stepKeys.reduce<
    Array<{ key: string; label: string; detail: string; done: boolean }>
  >((items, step, i) => {
    const message = stepMessages[step];
    if (message)
      items.push({ key: step, label: message.label, detail: message.detail, done: i === 0 });
    return items;
  }, []);

  return (
    <AppShell
      nav={selected}
      user={{ name: u('name'), initials: u('initials'), school: u('school'), role: s(selected) }}
    >
      <Welcome role={key} firstName={u('name')} subtitle={t(`${key}.subtitle`)} steps={steps} />
    </AppShell>
  );
}
