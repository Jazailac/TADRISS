'use client';

import { ChevronsUpDown, LogOut, Menu, Search, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { logout } from '@/app/actions/auth';
import { Link, usePathname } from '@/i18n/navigation';
import { LocaleSwitcher } from '../locale-switcher';
import { ThemeToggle } from '../theme-toggle';
import { cx } from '../ui/cx';
import { Mark } from '../ui/logo';
import { Spinner } from '../ui/spinner';
import { navSets, settingsItem, type NavGroup, type NavItem, type NavSet } from './nav';

export type ShellUser = { name: string; initials: string; role: string; school: string };

/** The deepest available item whose href prefixes the current path. */
function activeHrefFor(pathname: string, items: NavItem[]): string | null {
  return (
    items
      .filter((i) => i.available && (pathname === i.href || pathname.startsWith(`${i.href}/`)))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null
  );
}

function NavLink({ item, active, label }: { item: NavItem; active: boolean; label: string }) {
  const t = useTranslations('shell');
  const Icon = item.icon;
  if (!item.available) {
    return (
      <span
        aria-disabled="true"
        className="flex h-9 cursor-not-allowed items-center gap-3 rounded-md px-2.5 text-sm text-text-muted/60"
      >
        <Icon className="size-[1.05rem]" strokeWidth={1.75} aria-hidden />
        <span className="flex-1">{label}</span>
        <span className="rounded-full bg-surface px-1.5 py-0.5 text-[0.6rem] font-medium tracking-wide text-text-muted ring-1 ring-border">
          {t('soon')}
        </span>
      </span>
    );
  }
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

function SignOutButton() {
  const t = useTranslations('shell');
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={t('signOut')}
      disabled={pending}
      className="inline-flex size-8 items-center justify-center rounded-md text-text-muted hover:bg-surface hover:text-text"
    >
      {pending ? <Spinner label={false} /> : <LogOut className="rtl-flip size-4" aria-hidden />}
    </button>
  );
}

function Sidebar({
  nav,
  showSettings,
  user,
}: {
  nav: NavGroup[];
  showSettings: boolean;
  user: ShellUser;
}) {
  const t = useTranslations('shell');
  const locale = useLocale();
  const pathname = usePathname();
  const all = [...nav.flatMap((g) => g.items), settingsItem];
  const active = activeHrefFor(pathname, all);

  return (
    <div className="flex h-full flex-col gap-6 px-4 py-5">
      <div className="flex items-center gap-3 rounded-lg p-1.5">
        <span className="inline-flex size-9 items-center justify-center rounded-md bg-ink text-accent shadow-sm">
          <Mark className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span dir="auto" className="block truncate text-start text-sm font-semibold">
            {user.school}
          </span>
          <span className="block truncate text-xs text-text-muted">{user.role}</span>
        </span>
        <ChevronsUpDown className="size-4 text-text-muted/50" aria-hidden />
      </div>

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
                  active={item.href === active}
                  label={t(`nav.${item.key}`)}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="grid gap-0.5 border-t border-border pt-4">
        {showSettings ? (
          <NavLink
            item={settingsItem}
            active={settingsItem.href === active}
            label={t(`nav.${settingsItem.key}`)}
          />
        ) : null}
        <div className="mt-3 flex items-center gap-3 rounded-lg p-1.5">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent ring-1 ring-accent/20">
            {user.initials}
          </span>
          <span className="min-w-0 flex-1">
            <span dir="auto" className="block truncate text-start text-sm font-medium">
              {user.name}
            </span>
            <span className="block truncate text-xs text-text-muted">{user.role}</span>
          </span>
          <form action={logout}>
            <input type="hidden" name="locale" value={locale} />
            <SignOutButton />
          </form>
        </div>
      </div>
    </div>
  );
}

/** Authenticated layout: fixed sidebar ≥ lg, drawer below. */
export function AppShell({
  nav: navSet,
  user,
  children,
}: {
  nav: NavSet;
  user: ShellUser;
  children: ReactNode;
}) {
  const t = useTranslations('shell');
  const nav = navSets[navSet];
  const showSettings = navSet === 'institution_admin';
  const pathname = usePathname();
  const drawerId = useId();
  // Open "for" a path, so navigating closes the drawer without an effect.
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
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh border-e border-border bg-surface-muted/60 lg:block">
        <Sidebar nav={nav} showSettings={showSettings} user={user} />
      </aside>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" id={drawerId}>
          <button
            type="button"
            aria-label={t('closeMenu')}
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => {
              setOpenFor(null);
            }}
          />
          <div className="absolute inset-y-0 start-0 w-[17rem] max-w-[85vw] border-e border-border bg-background shadow-lg">
            <button
              type="button"
              aria-label={t('closeMenu')}
              onClick={() => {
                setOpenFor(null);
              }}
              className="absolute end-3 top-5 inline-flex size-9 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted"
            >
              <X className="size-4" aria-hidden />
            </button>
            <Sidebar nav={nav} showSettings={showSettings} user={user} />
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
              setOpenFor(pathname);
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
              disabled
              placeholder={t('searchPlaceholder')}
              className="h-9 w-full rounded-md border border-border bg-surface ps-9 pe-14 text-sm shadow-xs placeholder:text-text-muted/80 disabled:cursor-not-allowed"
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
