'use client';

import { Menu, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { LocaleSwitcher } from './locale-switcher';
import { ThemeToggle } from './theme-toggle';
import { ButtonLink } from './ui/button';
import { Logo } from './ui/logo';

const sections = ['features', 'roles', 'security'] as const;

export function SiteHeader() {
  const t = useTranslations('nav');
  const menuId = useId();
  const pathname = usePathname();
  // The menu is "open for" a path, so navigating closes it without an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

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

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 md:px-8">
        <Link href="/" className="rounded-md text-text" aria-label={t('home')}>
          <Logo />
        </Link>

        <nav aria-label={t('main')} className="hidden items-center gap-1 lg:flex">
          {sections.map((s) => (
            <Link
              key={s}
              href={`/#${s}`}
              className="rounded-md px-3 py-2 text-sm text-text-muted transition-colors hover:text-text"
            >
              {t(s)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LocaleSwitcher />
          <ThemeToggle />
          <span aria-hidden className="mx-1 h-5 w-px bg-border" />
          <ButtonLink href="/login" variant="ghost" size="sm">
            {t('login')}
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            {t('signup')}
          </ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-md text-text hover:bg-surface-muted lg:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? t('closeMenu') : t('openMenu')}
          onClick={() => {
            setOpenFor(open ? null : pathname);
          }}
        >
          {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>
      </div>

      <nav
        id={menuId}
        aria-label={t('main')}
        hidden={!open}
        className="border-t border-border/70 bg-background px-5 pt-3 pb-6 lg:hidden"
      >
        <ul className="grid">
          {sections.map((s) => (
            <li key={s}>
              <Link
                href={`/#${s}`}
                onClick={() => {
                  setOpenFor(null);
                }}
                className="flex h-12 items-center border-b border-border/60 text-[0.9375rem] text-text"
              >
                {t(s)}
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between">
          <LocaleSwitcher />
          <ThemeToggle />
        </div>
        <div className="mt-5 grid gap-2">
          <ButtonLink href="/signup" size="lg">
            {t('signup')}
          </ButtonLink>
          <ButtonLink href="/login" variant="secondary" size="lg">
            {t('login')}
          </ButtonLink>
        </div>
      </nav>
    </header>
  );
}
