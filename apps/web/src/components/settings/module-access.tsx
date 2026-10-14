'use client';

import { roleModules, type ConfigurableRole, type ModuleKey } from '@tadriss/shared';
import { useTranslations } from 'next-intl';
import { useOptimistic, useTransition } from 'react';
import { setModuleEnabledAction } from '@/app/actions/settings';
import { useRouter } from '@/i18n/navigation';
import { cx } from '../ui/cx';
import { useToast } from '../ui/toast';

/**
 * A switch per module for one role. Optimistic: the switch moves at once and snaps back, with a
 * message, if the server refuses.
 */
export function ModuleAccessList({
  role,
  disabled,
}: {
  role: ConfigurableRole;
  disabled: ModuleKey[];
}) {
  const t = useTranslations('settings.modules');
  const n = useTranslations('shell.nav');
  const e = useTranslations('errors');
  const toast = useToast();
  const router = useRouter();
  const [, start] = useTransition();
  const [off, setOff] = useOptimistic(
    disabled,
    (current, change: { module: ModuleKey; enabled: boolean }) =>
      change.enabled ? current.filter((m) => m !== change.module) : [...current, change.module],
  );

  const toggle = (module: ModuleKey, enabled: boolean) => {
    start(async () => {
      setOff({ module, enabled });
      const res = await setModuleEnabledAction(role, module, enabled);
      if (res.ok) {
        toast.success(t(enabled ? 'feedback.enabled' : 'feedback.disabled', { name: n(module) }));
      } else toast.error(e(res.error));
      router.refresh();
    });
  };

  return (
    <ul aria-label={t(`list.${role}`)} className="grid grid-cols-1 divide-y divide-border">
      {roleModules[role].map((module) => {
        const on = !off.includes(module);
        return (
          <li key={module} className="flex items-center gap-4 py-3">
            <span className="min-w-0 flex-1 font-medium">{n(module)}</span>
            <span className="text-xs text-text-muted">{on ? t('on') : t('off')}</span>
            <button
              type="button"
              role="switch"
              aria-checked={on}
              aria-label={t('switchLabel', { name: n(module), role: t(`roles.${role}`) })}
              onClick={() => {
                toggle(module, !on);
              }}
              className={cx(
                'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                on ? 'bg-primary' : 'bg-border-strong',
              )}
            >
              <span
                aria-hidden
                className={cx(
                  'absolute top-0.5 size-5 rounded-full bg-surface shadow-sm transition-[inset-inline-start]',
                  on ? 'start-[1.375rem]' : 'start-0.5',
                )}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
