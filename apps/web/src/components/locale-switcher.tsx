'use client';

import { locales, type Locale } from '@tadriss/shared';
import { useLocale, useTranslations } from 'next-intl';
import { useTransition } from 'react';
import { usePathname, useRouter } from '@/i18n/navigation';
import { cx } from './ui/cx';

/** Segmented FR · ع · EN control. Each option carries its full language name for screen readers. */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations('locale');
  const current = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  return (
    <div
      role="group"
      aria-label={t('label')}
      aria-busy={pending || undefined}
      className={cx(
        'inline-flex h-9 items-center rounded-full bg-surface-muted p-0.5 ring-1 ring-border ring-inset',
        pending && 'opacity-70',
        className,
      )}
    >
      {locales.map((l: Locale) => {
        const active = l === current;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={active}
            aria-label={t(l)}
            disabled={pending}
            onClick={() => {
              if (!active)
                startTransition(() => {
                  router.replace(pathname, { locale: l });
                });
            }}
            className={cx(
              'h-8 min-w-9 rounded-full px-2.5 text-xs font-semibold transition-all',
              active ? 'bg-surface text-text shadow-sm' : 'text-text-muted hover:text-text',
            )}
          >
            {t(`short.${l}`)}
          </button>
        );
      })}
    </div>
  );
}
