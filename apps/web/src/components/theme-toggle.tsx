'use client';

import { Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { cx } from './ui/cx';

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('theme');
  const { resolvedTheme, setTheme } = useTheme();
  // Both icons render; CSS picks one, so there is no hydration flash.
  return (
    <button
      type="button"
      onClick={() => {
        setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
      }}
      aria-label={t('toggle')}
      className={cx(
        'inline-flex size-10 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-muted hover:text-text',
        className,
      )}
    >
      <Sun className="size-[1.1rem] dark:hidden" strokeWidth={1.75} aria-hidden />
      <Moon className="hidden size-[1.1rem] dark:block" strokeWidth={1.75} aria-hidden />
    </button>
  );
}
