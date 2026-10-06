'use client';

import { ChevronsUpDown, LogOut, Menu, Search, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { LocaleSwitcher } from '../locale-switcher';
import { ThemeToggle } from '../theme-toggle';
import { cx } from '../ui/cx';
import { Mark } from '../ui/logo';
import { navSets, settingsItem, type NavGroup, type NavItem, type NavSet } from './nav';

type ShellUser = { name: string; initials: string; role: string; school: string };

function NavLink({ item, active, label }: { item: NavItem; active: boolean; label: string }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cx(
        'group relative flex h-9 items-center gap-3 rounded-md px-2.5 text-sm transition-colors',
        active
          ? 'bg-surface font-medium text-text shadow-sm ring-1 ring-border'
          : 'text-text-muted hover:bg-surface/70 hover:text-text',
      )}
    >
      {active ? (
        <span aria-hidden className="absolute inset-y-2 -start-3 w-0.5 rounded-full bg-primary" />
      ) : null}
      <Icon
        className={cx(
          'size-[1.05rem]',
          active ? 'text-primary' : 'text-text-muted group-hover:text-text',
        )}
        strokeWidth={1.75}
        aria-hidden
      />
      {label}
    </Link>
  );
}

function Sidebar({
  nav,
  activeHref,
  user,
}: {
  nav: NavGroup[];
  activeHref: string;
  user: ShellUser;
}) {
  const t = useTranslations('shell');
  return (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <button
        type="button"
        className="flex items-center gap-3 rounded-lg p-1.5 text-start hover:bg-surface/70"
      >
        <span className="inline-flex size-9 items-center justify-center rounded-md bg-ink text-accent shadow-sm">
          <Mark className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{user.school}</span>
          <span className="block truncate text-xs text-text-muted">{t('plan')}</span>
        </span>
        <ChevronsUpDown className="size-4 text-text-muted" aria-hidden />
      </button>

      <nav aria-label={t('navigation')} className="-mx-1 flex-1 overflow-y-auto px-1">
        {nav.map((group) => (
          <div key={group.key} className="mb-5">
            <p className="mb-1.5 px-2.5 font-mono text-[0.65rem] font-medium tracking-[0.14em] text-text-muted/80 uppercase">
              {t(`groups.${group.key}`)}
            </p>
            <div className="grid gap-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.key}
                  item={item}
                  active={item.href === activeHref}
                  label={t(`nav.${item.key}`)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="grid gap-0.5 border-t border-border pt-4">
        <NavLink
          item={settingsItem}
          active={settingsItem.href === activeHref}
          label={t(`nav.${settingsItem.key}`)}
        />
        <div className="mt-3 flex items-center gap-3 rounded-lg p-1.5">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent ring-1 ring-accent/20">
            {user.initials}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user.name}</span>
            <span className="block truncate text-xs text-text-muted">{user.role}</span>
          </span>
          <button
            type="button"
            aria-label={t('signOut')}
            className="inline-flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-surface hover:text-text"
          >
            <LogOut className="rtl-flip size-4" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Authenticated layout: fixed sidebar ≥ lg, drawer below. */
export function AppShell({
  nav: navSet,
  activeHref,
  user,
  children,
}: {
  nav: NavSet;
  activeHref: string;
  user: ShellUser;
  children: ReactNode;
}) {
  const t = useTranslations('shell');
  const nav = navSets[navSet];
  const [open, setOpen] = useState(false);
  const drawerId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-e border-border bg-surface-muted/60 lg:block">
        <Sidebar nav={nav} activeHref={activeHref} user={user} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" id={drawerId}>
          <button
            type="button"
            aria-label={t('closeMenu')}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => {
              setOpen(false);
            }}
          />
          <div className="absolute inset-y-0 start-0 w-[17rem] max-w-[85vw] border-e border-border bg-background shadow-lg">
            <button
              type="button"
              aria-label={t('closeMenu')}
              onClick={() => {
                setOpen(false);
              }}
              className="absolute end-3 top-5 inline-flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted"
            >
              <X className="size-4" aria-hidden />
            </button>
            <Sidebar nav={nav} activeHref={activeHref} user={user} />
          </div>
        </div>
      ) : null}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-5 backdrop-blur-xl md:px-8">
          <button
            type="button"
            className="inline-flex size-10 items-center justify-center rounded-md hover:bg-surface-muted lg:hidden"
            aria-label={t('openMenu')}
            aria-expanded={open}
            aria-controls={drawerId}
            onClick={() => {
              setOpen(true);
            }}
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <label className="relative hidden max-w-sm flex-1 sm:block">
            <span className="sr-only">{t('search')}</span>
            <Search
              className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-text-muted"
              aria-hidden
            />
            <input
              type="search"
              placeholder={t('searchPlaceholder')}
              className="h-9 w-full rounded-md border border-border bg-surface ps-9 pe-14 text-sm shadow-xs placeholder:text-text-muted/80 focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none"
            />
            <kbd className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded border border-border bg-surface-muted px-1.5 font-mono text-[0.65rem] text-text-muted">
              {t('searchShortcut')}
            </kbd>
          </label>
          <div className="ms-auto flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="px-5 py-8 md:px-8 lg:px-12">{children}</main>
      </div>
    </div>
  );
}
