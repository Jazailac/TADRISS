'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { CloseIcon, MenuIcon } from './icons';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';

export function SiteHeader() {
  const t = useTranslations('nav');
  const menuId = useId();
  const pathname = usePathname();
  // The menu is "open for" a given path, so navigating closes it without an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;
  const setOpen = (next: boolean) => {
    setOpenFor(next ? pathname : null);
  };

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenFor(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const authLinks = (
    <>
      <Link
        href="/login"
        className="inline-flex h-11 items-center rounded-md px-4 font-medium hover:bg-surface-muted"
      >
        {t('login')}
      </Link>
      <Link
        href="/signup"
        className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t('signup')}
      </Link>
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-6 md:px-12">
        <Link href="/" className="font-heading text-xl font-extrabold text-primary">
          {t('brand')}
        </Link>

        <nav aria-label={t('main')} className="hidden items-center gap-2 md:flex">
          <Link
            href="/#features"
            className="inline-flex h-11 items-center px-3 text-text-muted hover:text-text"
          >
            {t('features')}
          </Link>
          <LocaleSwitcher />
          <ThemeToggle />
          {authLinks}
        </nav>

        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-md hover:bg-surface-muted md:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? t('closeMenu') : t('openMenu')}
          onClick={() => {
            setOpen(!open);
          }}
        >
          {open ? <CloseIcon /> : <MenuIcon />}
        </button>
      </div>

      <nav
        id={menuId}
        aria-label={t('main')}
        hidden={!open}
        className="border-t border-border bg-background px-6 pb-6 pt-2 md:hidden"
      >
        <div className="flex flex-col gap-2">
          <Link
            href="/#features"
            className="inline-flex h-11 items-center text-text-muted hover:text-text"
          >
            {t('features')}
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
          <div className="mt-2 grid gap-2">{authLinks}</div>
        </div>
      </nav>
    </header>
  );
}
