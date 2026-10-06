'use client';

import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { MoonIcon, SunIcon } from './icons';

export function ThemeToggle() {
  const t = useTranslations('theme');
  const { resolvedTheme, setTheme } = useTheme();
  // Both icons render; CSS picks one, so there is no hydration flash or mounted-state dance.
  return (
    <button
      type="button"
      onClick={() => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
      }}
      aria-label={t('toggle')}
      className="inline-flex size-11 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted hover:text-text"
    >
      <SunIcon className="size-5 dark:hidden" />
      <MoonIcon className="hidden size-5 dark:block" />
    </button>
  );
}
