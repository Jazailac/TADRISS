import { getTranslations } from 'next-intl/server';
import { Welcome } from '@/components/home/welcome';
import { getViewer } from '@/lib/viewer';

export default async function Home() {
  const [viewer, t] = await Promise.all([getViewer(), getTranslations('app.teacher')]);
  const firstName = viewer?.profile.firstName ?? '';
  const steps = (['account', 'classes', 'attendance'] as const).map((key, i) => ({
    key,
    label: t(`steps.${key}.label`),
    detail: t(`steps.${key}.detail`),
    done: i === 0,
  }));
  return <Welcome firstName={firstName} subtitle={t('subtitle')} steps={steps} />;
}
