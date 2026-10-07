import { countPeople } from '@tadriss/shared';
import { getTranslations } from 'next-intl/server';
import { Welcome } from '@/components/home/welcome';
import { getServerClient } from '@/lib/supabase/server';
import { getViewer } from '@/lib/viewer';

export default async function Home() {
  const supabase = await getServerClient();
  const [viewer, t, teachers, students] = await Promise.all([
    getViewer(),
    getTranslations('app.admin'),
    countPeople(supabase, 'teacher'),
    countPeople(supabase, 'student'),
  ]);
  const firstName = viewer?.profile.firstName ?? '';
  const hasTeam = [teachers, students].some(
    (c) => c.ok && c.data.active + c.data.inactive + c.data.invited > 0,
  );
  const done: Record<'account' | 'team' | 'classes', boolean> = {
    account: true,
    team: hasTeam,
    classes: false,
  };
  const steps = (['account', 'team', 'classes'] as const).map((key) => ({
    key,
    label: t(`steps.${key}.label`),
    detail: t(`steps.${key}.detail`),
    done: done[key],
  }));
  return <Welcome firstName={firstName} subtitle={t('subtitle')} steps={steps} />;
}
