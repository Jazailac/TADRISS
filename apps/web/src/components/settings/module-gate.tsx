import type { ModuleKey } from '@tadriss/shared';
import { Lock } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import type { ReactNode } from 'react';
import { getDisabledModules } from '@/lib/modules';
import { Card } from '../ui/card';

/**
 * Wraps a module's routes (`<role>/<module>/layout.tsx`). When the administration has switched the
 * module off for this role, an explanation replaces the page instead of a dead end.
 */
export async function ModuleGate({ module, children }: { module: ModuleKey; children: ReactNode }) {
  const disabled = await getDisabledModules();
  if (!disabled.includes(module)) return children;
  const t = await getTranslations('settings.modules');
  return (
    <div className="mx-auto grid grid-cols-1 max-w-3xl gap-7">
      <Card role="alert" className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-warning-soft text-warning">
          <Lock className="size-5" aria-hidden />
        </span>
        <h1 className="display text-2xl">{t('disabledTitle')}</h1>
        <p className="max-w-md text-sm text-text-muted">{t('disabledBody')}</p>
      </Card>
    </div>
  );
}
