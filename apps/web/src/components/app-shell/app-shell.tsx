'use client';
import {
  Bell,
  ChevronRight,
  Home,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { logout } from '@/app/actions/auth';
import { Link, usePathname } from '@/i18n/navigation';
import { LocaleSwitcher } from '../locale-switcher';
import { ThemeToggle } from '../theme-toggle';
import { cx } from '../ui/cx';
import { Logo, Mark } from '../ui/logo';
import { Spinner } from '../ui/spinner';
import { EmptyState } from '../ui/empty-state';
import { matchNav, navSets, settingsItem, type NavGroup, type NavItem, type NavSet } from './nav';

export type UnreadCounts = { announcements: number; messages: number };
export type ShellUser = { name: string; initials: string; role: string; school: string };
function SignOutButton() {
  const t = useTranslations('shell');
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      aria-label={t('signOut')}
      disabled={pending}
      className="grid size-10 shrink-0 place-items-center rounded-lg text-text-muted hover:bg-surface-muted"
    >
      {pending ? <Spinner label={false} /> : <LogOut className="rtl-flip size-4" aria-hidden />}
    </button>
  );
}
function Sidebar({
  nav,
  user,
  unread,
  collapsed = false,
  close,
}: {
  nav: NavGroup[];
  user: ShellUser;
  unread: UnreadCounts;
  collapsed?: boolean;
  close?: () => void;
}) {
  const t = useTranslations('shell');
  const s = useTranslations('studio');
  const locale = useLocale();
  const pathname = usePathname();
  const activeItem = matchNav(
    nav.flatMap((g) => g.items).filter((i) => i.available),
    pathname,
  );
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="flex h-9 items-center gap-3 ps-2">
        {collapsed ? <Mark className="size-6 text-primary" /> : <Logo />}
        {close ? (
          <button
            type="button"
            aria-label={t('closeMenu')}
            onClick={close}
            className="ms-auto grid size-9 place-items-center rounded-lg hover:bg-surface-muted"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <div
        className={cx('rounded-xl border border-border bg-background', collapsed ? 'p-2' : 'p-3')}
      >
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Mark className="size-4" />
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p dir="auto" className="truncate text-sm font-semibold">
                {user.school}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">{user.role}</p>
            </div>
          ) : null}
        </div>
      </div>
      <nav aria-label={t('navigation')} className="min-h-0 flex-1 overflow-y-auto">
        {nav.map((group) => (
          <div key={group.key} className="mb-5">
            {!collapsed ? (
              <p className="mb-2 px-3 text-[0.65rem] font-semibold tracking-widest text-text-muted uppercase">
                {t(`groups.${group.key}`)}
              </p>
            ) : null}
            <div className="grid gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const count =
                  item.key === 'announcements' || item.key === 'messages' ? unread[item.key] : 0;
                const active = item.available && item.href === activeItem?.href;
                const classes = cx(
                  'flex min-h-10 items-center rounded-lg text-sm',
                  collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                  active
                    ? 'bg-primary-soft font-semibold text-primary'
                    : item.available
                      ? 'text-text-muted hover:bg-surface-muted'
                      : 'text-text-muted',
                );
                return item.available ? (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-label={collapsed ? t(`nav.${item.key}`) : undefined}
                    title={collapsed ? t(`nav.${item.key}`) : undefined}
                    aria-current={active ? 'page' : undefined}
                    onClick={close}
                    className={classes}
                  >
                    <span className="relative grid shrink-0 place-items-center">
                      <Icon className="size-4" strokeWidth={1.75} aria-hidden />
                      {collapsed && count > 0 ? (
                        <span
                          aria-hidden
                          className="absolute -end-1 -top-1 size-2 rounded-full bg-accent"
                        />
                      ) : null}
                    </span>
                    {!collapsed ? <span className="flex-1">{t(`nav.${item.key}`)}</span> : null}
                    {count > 0 ? (
                      <span
                        className={cx(
                          'rounded-full bg-primary text-primary-foreground tabular-nums',
                          collapsed
                            ? 'sr-only'
                            : 'min-w-5 px-1.5 py-0.5 text-center text-[0.65rem] font-semibold',
                        )}
                      >
                        <span aria-hidden={!collapsed}>{count}</span>
                        <span className="sr-only">{t('unread', { count })}</span>
                      </span>
                    ) : null}
                  </Link>
                ) : (
                  <span
                    key={item.key}
                    aria-disabled="true"
                    title={collapsed ? t(`nav.${item.key}`) : undefined}
                    className={classes}
                  >
                    <Icon className="size-4 shrink-0 opacity-65" strokeWidth={1.75} aria-hidden />
                    {!collapsed ? (
                      <>
                        <span className="flex-1">{t(`nav.${item.key}`)}</span>
                        <span className="rounded bg-surface-muted px-1.5 py-0.5 text-[0.55rem]">
                          {t('soon')}
                        </span>
                      </>
                    ) : null}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      {!collapsed ? (
        <div className="grid gap-3">
          <div className="lg:hidden">
            <LocaleSwitcher />
          </div>
          <div className="rounded-xl bg-primary-soft/60 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <ShieldCheck className="size-4" aria-hidden />
              {s('protected')}
            </div>
          </div>
        </div>
      ) : null}
      <div className="flex items-center gap-2 border-t border-border pt-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
          {user.initials}
        </span>
        {!collapsed ? (
          <>
            <div className="min-w-0 flex-1">
              <p dir="auto" className="truncate text-xs font-medium">
                {user.name}
              </p>
              <p className="mt-0.5 text-[0.65rem] text-text-muted">{user.role}</p>
            </div>
            <form action={logout}>
              <input type="hidden" name="locale" value={locale} />
              <SignOutButton />
            </form>
          </>
        ) : null}
      </div>
    </div>
  );
}
export function AppShell({
  nav: navSet,
  user,
  unread = { announcements: 0, messages: 0 },
  children,
}: {
  nav: NavSet;
  user: ShellUser;
  /** Badges for the communication items; the design previews have none. */
  unread?: UnreadCounts;
  children: ReactNode;
}) {
  const t = useTranslations('shell');
  const s = useTranslations('studio');
  const nav = navSets[navSet];
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const drawer = useRef<HTMLDialogElement>(null);
  const command = useRef<HTMLDialogElement>(null);
  const notifications = useRef<HTMLDialogElement>(null);
  const available = [...nav.flatMap((g) => g.items), settingsItem].filter(
    (item: NavItem) => item.available,
  );
  const current = matchNav(available, pathname);
  const unreadLinks = available.flatMap((item) => {
    const count = item.key === 'announcements' || item.key === 'messages' ? unread[item.key] : 0;
    return count > 0 ? [{ ...item, count }] : [];
  });
  const home = available[0]?.href ?? '/';
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        command.current?.showModal();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, []);
  const closeDrawer = () => {
    drawer.current?.close();
  };
  return (
    <div
      className="min-h-dvh bg-background lg:grid"
      style={{ gridTemplateColumns: collapsed ? '5.25rem minmax(0,1fr)' : '16rem minmax(0,1fr)' }}
    >
      <aside className="app-sidebar sticky top-0 hidden h-dvh border-e border-border lg:block">
        <Sidebar nav={nav} user={user} unread={unread} collapsed={collapsed} />
      </aside>
      <dialog
        ref={drawer}
        className="shell-dialog fixed inset-y-0 m-0 h-dvh max-h-dvh w-72 max-w-[90vw] rounded-none"
        aria-label={t('navigation')}
      >
        <Sidebar nav={nav} user={user} unread={unread} close={closeDrawer} />
      </dialog>
      <dialog ref={command} className="shell-dialog" aria-label={s('command')}>
        <div className="flex items-center gap-3 border-b border-border p-5">
          <Search className="size-5 text-primary" aria-hidden />
          <input
            aria-label={s('command')}
            autoComplete="off"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder={s('command')}
            className="h-10 min-w-0 flex-1 bg-transparent text-text outline-none"
          />
          <button
            type="button"
            aria-label={s('close')}
            onClick={() => {
              command.current?.close();
            }}
            className="grid size-9 place-items-center rounded-lg hover:bg-surface-muted"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="grid gap-2 p-4">
          {available
            .filter((item) =>
              t(`nav.${item.key}`).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
            )
            .map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={() => {
                  command.current?.close();
                }}
                className="flex items-center gap-3 rounded-xl p-4 text-sm hover:bg-primary-soft hover:text-primary"
              >
                <item.icon className="size-4" aria-hidden />
                {t(`nav.${item.key}`)}
                <ChevronRight className="rtl-flip ms-auto size-4" aria-hidden />
              </Link>
            ))}
          {available.every(
            (item) => !t(`nav.${item.key}`).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
          ) ? (
            <p className="p-5 text-sm text-text-muted">{s('commandEmpty')}</p>
          ) : null}
        </div>
      </dialog>
      <dialog ref={notifications} className="shell-dialog" aria-label={s('notifications')}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-semibold">{s('notifications')}</h2>
          <button
            type="button"
            aria-label={s('close')}
            onClick={() => {
              notifications.current?.close();
            }}
            className="grid size-9 place-items-center rounded-lg hover:bg-surface-muted"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        {unreadLinks.length === 0 ? (
          <EmptyState title={s('noNotifications')} description={s('notificationBody')} />
        ) : (
          <ul className="grid gap-1 p-3">
            {unreadLinks.map((item) => (
              <li key={item.key}>
                <Link
                  href={item.href}
                  onClick={() => {
                    notifications.current?.close();
                  }}
                  className="flex items-center gap-3 rounded-xl p-3 text-sm hover:bg-primary-soft hover:text-primary"
                >
                  <item.icon className="size-4" aria-hidden />
                  <span className="flex-1">{t(`nav.${item.key}`)}</span>
                  <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                    {t('unread', { count: item.count })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </dialog>
      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-18 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur-xl md:px-8">
          <button
            type="button"
            aria-label={collapsed ? s('expand') : s('collapse')}
            onClick={() => {
              setCollapsed((v) => !v);
            }}
            className="hidden size-9 items-center justify-center rounded-lg text-text-muted hover:bg-surface-muted lg:inline-flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="rtl-flip size-4" aria-hidden />
            ) : (
              <PanelLeftClose className="rtl-flip size-4" aria-hidden />
            )}
          </button>
          <button
            type="button"
            aria-label={t('openMenu')}
            onClick={() => {
              drawer.current?.showModal();
            }}
            className="grid size-9 place-items-center rounded-lg hover:bg-surface-muted lg:hidden"
          >
            <Menu className="size-5" aria-hidden />
          </button>
          <span className="hidden items-center gap-2 text-xs text-text-muted md:flex">
            {user.role}
            <ChevronRight className="rtl-flip size-3" aria-hidden />
            <span className="text-text">{current ? t(`nav.${current.key}`) : s('overview')}</span>
          </span>
          <div className="ms-auto flex items-center gap-1">
            <button
              type="button"
              aria-label={t('search')}
              onClick={() => {
                command.current?.showModal();
              }}
              className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted"
            >
              <Search className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              aria-label={s('notifications')}
              onClick={() => {
                notifications.current?.showModal();
              }}
              className="grid size-9 place-items-center rounded-lg text-text-muted hover:bg-surface-muted"
            >
              <span className="relative grid place-items-center">
                <Bell className="size-4" aria-hidden />
                {unreadLinks.length > 0 ? (
                  <span
                    aria-hidden
                    className="absolute -end-0.5 -top-0.5 size-2 rounded-full bg-accent"
                  />
                ) : null}
              </span>
            </button>
            <div className="hidden sm:block">
              <LocaleSwitcher />
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="px-5 py-8 pb-28 md:px-8 lg:px-10 lg:pb-10">{children}</main>
        <nav
          aria-label={s('overview')}
          className="fixed inset-x-0 bottom-0 z-30 flex justify-around border-t border-border bg-surface pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
        >
          <Link
            href={home}
            className="flex min-w-20 flex-col items-center gap-1 rounded-lg py-2 text-[0.65rem] text-primary"
          >
            <Home className="size-5" aria-hidden />
            {s('overview')}
          </Link>
          <button
            type="button"
            onClick={() => {
              command.current?.showModal();
            }}
            className="flex min-w-20 flex-col items-center gap-1 rounded-lg py-2 text-[0.65rem] text-text-muted"
          >
            <Search className="size-5" aria-hidden />
            {t('search')}
          </button>
          <button
            type="button"
            onClick={() => {
              drawer.current?.showModal();
            }}
            className="flex min-w-20 flex-col items-center gap-1 rounded-lg py-2 text-[0.65rem] text-text-muted"
          >
            <Menu className="size-5" aria-hidden />
            {t('navigation')}
          </button>
        </nav>
      </div>
    </div>
  );
}
