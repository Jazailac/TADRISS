'use client';
import {
  Bell,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react';
import type { PersonHit } from '@tadriss/shared';
import { useFormStatus } from 'react-dom';
import { logout } from '@/app/actions/auth';
import { searchPeopleAction } from '@/app/actions/people';
import { Link, usePathname } from '@/i18n/navigation';
import { LocaleSwitcher } from '../locale-switcher';
import { ThemeToggle } from '../theme-toggle';
import { Avatar } from '../ui/avatar';
import { cx } from '../ui/cx';
import { Logo, Mark } from '../ui/logo';
import { Spinner } from '../ui/spinner';
import { EmptyState } from '../ui/empty-state';
import { matchNav, navSets, type NavGroup, type NavItem, type NavSet } from './nav';

export type UnreadCounts = { announcements: number; messages: number };
export type ShellUser = { name: string; initials: string; role: string; school: string };

/** True only for a pointer outside the dialog's box; its own padding also targets the dialog. */
function isOnBackdrop(event: MouseEvent<HTMLDialogElement>): boolean {
  if (event.target !== event.currentTarget) return false;
  const box = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < box.left ||
    event.clientX > box.right ||
    event.clientY < box.top ||
    event.clientY > box.bottom
  );
}

/** Where a person found in the page switcher leads: a student's file, or their filtered list. */
function personHref(person: PersonHit): string {
  if (person.role === 'student') return `/dashboard/students/${person.id}`;
  const list = person.role === 'teacher' ? 'teachers' : 'parents';
  return `/dashboard/${list}?q=${encodeURIComponent(person.lastName)}`;
}

/** Keep the selected child's file open while navigating between parent sections. */
function navigationHref(href: string, childId?: string | null): string {
  if (!childId || !(href === '/parent' || href.startsWith('/parent/'))) return href;
  return `${href}${href.includes('?') ? '&' : '?'}${new URLSearchParams({ child: childId })}`;
}

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
  childId,
}: {
  nav: NavGroup[];
  user: ShellUser;
  unread: UnreadCounts;
  collapsed?: boolean;
  close?: () => void;
  childId?: string | null;
}) {
  const t = useTranslations('shell');
  const brand = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const activeItem = matchNav(
    nav.flatMap((g) => g.items).filter((i) => i.available),
    pathname,
  );
  return (
    <div className="sidebar-content flex h-full flex-col gap-5 p-4">
      <div className="flex h-11 shrink-0 items-center gap-3 ps-2">
        <Link
          href={navigationHref(nav[0]?.items[0]?.href ?? '/', childId)}
          onClick={close}
          aria-label={brand('home')}
        >
          {collapsed ? <Mark className="size-6 text-primary" /> : <Logo />}
        </Link>
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
        className={cx(
          'shrink-0 rounded-xl border border-border bg-surface-muted/40',
          collapsed ? 'p-2' : 'p-3',
        )}
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
              <p className="mt-1 text-xs text-text-muted">{user.role}</p>
            </div>
          ) : null}
        </div>
      </div>
      <nav aria-label={t('navigation')} className="min-h-0 flex-1 overflow-y-auto">
        {nav.map((group) => (
          <div key={group.key} className="mb-5 last:mb-0">
            {!collapsed ? (
              <p className="sidebar-group-label mb-2 px-3 text-[0.6875rem] font-semibold tracking-[0.08em] text-text-muted uppercase">
                {t(`groups.${group.key}`)}
              </p>
            ) : null}
            <div className="grid gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const count =
                  item.key === 'announcements' || item.key === 'messages' ? unread[item.key] : 0;
                const active = item.available && item.href === activeItem?.href;
                const classes = cx(
                  'sidebar-link relative flex min-h-11 items-center rounded-lg text-[0.9375rem]',
                  collapsed ? 'justify-center px-2' : 'gap-3 px-3',
                  active
                    ? 'bg-primary-soft font-semibold text-primary'
                    : item.available
                      ? 'text-text-muted hover:bg-surface-muted hover:text-text'
                      : 'text-text-muted',
                );
                return item.available ? (
                  <Link
                    key={item.key}
                    href={navigationHref(item.href, childId)}
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
        <div className="lg:hidden">
          <LocaleSwitcher />
        </div>
      ) : null}
      <div
        className={cx(
          'flex shrink-0 items-center gap-2 border-t border-border pt-4',
          collapsed && 'flex-col',
        )}
      >
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-xl border border-border bg-surface-muted text-xs font-semibold text-text"
        >
          {user.initials}
        </span>
        {!collapsed ? (
          <>
            <div className="min-w-0 flex-1">
              <p dir="auto" className="truncate text-sm font-medium">
                {user.name}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">{user.role}</p>
            </div>
          </>
        ) : null}
        <form action={logout}>
          <input type="hidden" name="locale" value={locale} />
          <SignOutButton />
        </form>
      </div>
    </div>
  );
}
type AppShellProps = {
  nav: NavSet;
  user: ShellUser;
  unread?: UnreadCounts;
  hidden?: readonly string[];
  children: ReactNode;
};

export function AppShell(props: AppShellProps) {
  const shell = <AppShellContent {...props} />;
  return props.nav === 'parent' ? (
    <Suspense fallback={shell}>
      <ParentAppShell {...props} />
    </Suspense>
  ) : (
    shell
  );
}

function ParentAppShell(props: AppShellProps) {
  const search = useSearchParams();
  return <AppShellContent {...props} childId={search.get('child')} />;
}

function AppShellContent({
  nav: navSet,
  user,
  unread = { announcements: 0, messages: 0 },
  hidden = [],
  children,
  childId,
}: AppShellProps & { childId?: string | null }) {
  const t = useTranslations('shell');
  const s = useTranslations('studio');
  const nav = navSets[navSet]
    .map((g) => ({ ...g, items: g.items.filter((i) => !hidden.includes(i.key)) }))
    .filter((g) => g.items.length > 0);
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [query, setQuery] = useState('');
  const canSearchPeople = navSet === 'institution_admin';
  const wantsPeople = canSearchPeople && query.trim().length >= 2;
  const [people, setPeople] = useState<PersonHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [peopleFailed, setPeopleFailed] = useState(false);
  const latestSearch = useRef(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      clearTimeout(searchTimer.current);
    },
    [],
  );
  const resetPeopleSearch = useCallback(() => {
    clearTimeout(searchTimer.current);
    latestSearch.current += 1;
    setPeople([]);
    setPeopleFailed(false);
    setSearching(false);
  }, []);
  const searchPeople = (value: string) => {
    resetPeopleSearch();
    if (!canSearchPeople || value.trim().length < 2) return;
    const search = latestSearch.current;
    setSearching(true);
    searchTimer.current = setTimeout(() => {
      searchPeopleAction(value)
        .then((result) => {
          // A slower, older answer must not replace the results for what is typed now.
          if (search !== latestSearch.current) return;
          setPeople(result.ok ? result.data : []);
          setPeopleFailed(!result.ok);
          setSearching(false);
        })
        .catch(() => {
          // A dropped connection rejects instead of answering: stop the spinner and say so.
          if (search !== latestSearch.current) return;
          setPeople([]);
          setPeopleFailed(true);
          setSearching(false);
        });
    }, 200);
  };
  const drawer = useRef<HTMLDialogElement>(null);
  const command = useRef<HTMLDialogElement>(null);
  const notifications = useRef<HTMLDialogElement>(null);
  // A drag that starts inside a dialog and ends on the backdrop must not close it.
  const pressedBackdrop = useRef(false);
  const closeOnBackdrop = {
    onMouseDown: (event: MouseEvent<HTMLDialogElement>) => {
      pressedBackdrop.current = isOnBackdrop(event);
    },
    onClick: (event: MouseEvent<HTMLDialogElement>) => {
      if (pressedBackdrop.current && isOnBackdrop(event)) event.currentTarget.close();
      pressedBackdrop.current = false;
    },
  };
  const available = nav.flatMap((g) => g.items).filter((item: NavItem) => item.available);
  const current = matchNav(available, pathname);
  const unreadLinks = available.flatMap((item) => {
    const count = item.key === 'announcements' || item.key === 'messages' ? unread[item.key] : 0;
    return count > 0 ? [{ ...item, count }] : [];
  });
  const dockItems = [
    available[0],
    ...available.filter(
      (item) => item.key === 'schedule' || item.key === 'homework' || item.key === 'messages',
    ),
  ].filter((item): item is NavItem => !!item);
  const openCommand = () => {
    setQuery('');
    resetPeopleSearch();
    command.current?.showModal();
    command.current?.querySelector('input')?.focus();
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setQuery('');
        resetPeopleSearch();
        command.current?.showModal();
        command.current?.querySelector('input')?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [resetPeopleSearch]);
  const closeDrawer = () => {
    drawer.current?.close();
  };
  return (
    <div
      className="app-workspace min-h-dvh bg-background lg:grid"
      style={{ gridTemplateColumns: collapsed ? '5.25rem minmax(0,1fr)' : '17rem minmax(0,1fr)' }}
    >
      <a href="#workspace-main" className="skip-link">
        {t('skipToContent')}
      </a>
      <aside className="app-sidebar sticky top-0 hidden h-dvh lg:block">
        <Sidebar nav={nav} user={user} unread={unread} collapsed={collapsed} childId={childId} />
      </aside>
      <dialog
        ref={drawer}
        className="shell-dialog shell-drawer"
        aria-label={t('navigation')}
        {...closeOnBackdrop}
      >
        <Sidebar nav={nav} user={user} unread={unread} close={closeDrawer} childId={childId} />
      </dialog>
      <dialog
        ref={command}
        className="shell-dialog shell-command"
        aria-label={s('command')}
        {...closeOnBackdrop}
      >
        <div className="flex items-center gap-3 border-b border-border p-5">
          <Search className="size-5 text-primary" aria-hidden />
          <input
            aria-label={s('command')}
            autoComplete="off"
            maxLength={80}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              searchPeople(e.target.value);
            }}
            onKeyDown={(event) => {
              const first = command.current?.querySelector<HTMLAnchorElement>('a');
              if (event.key === 'ArrowDown' && first) {
                event.preventDefault();
                first.focus();
              }
              if (event.key === 'Enter' && first) {
                event.preventDefault();
                first.click();
              }
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
        <div
          className="grid gap-1 p-3"
          onKeyDown={(event) => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            const links = Array.from(event.currentTarget.querySelectorAll('a'));
            const at = links.findIndex((link) => link === document.activeElement);
            if (at === -1) return;
            event.preventDefault();
            const next = links[event.key === 'ArrowDown' ? at + 1 : at - 1];
            if (next) next.focus();
            else if (event.key === 'ArrowUp') command.current?.querySelector('input')?.focus();
          }}
        >
          {available
            .filter((item) =>
              t(`nav.${item.key}`).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
            )
            .map((item) => (
              <Link
                key={item.key}
                href={navigationHref(item.href, childId)}
                onClick={() => {
                  command.current?.close();
                }}
                className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm hover:bg-primary-soft hover:text-primary"
              >
                <item.icon className="size-4" aria-hidden />
                {t(`nav.${item.key}`)}
                <ChevronRight className="rtl-flip ms-auto size-4" aria-hidden />
              </Link>
            ))}
          {wantsPeople && !searching
            ? people.map((person) => (
                <Link
                  key={person.id}
                  href={personHref(person)}
                  onClick={() => {
                    command.current?.close();
                  }}
                  className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm hover:bg-primary-soft hover:text-primary"
                >
                  <Avatar
                    first={person.firstName}
                    last={person.lastName}
                    seed={person.id}
                    className="size-7 text-xs"
                  />
                  <span className="min-w-0 truncate">
                    <bdi>
                      {person.firstName} {person.lastName}
                    </bdi>
                  </span>
                  <span className="ms-auto shrink-0 text-xs text-text-muted">
                    {t(`roles.${person.role}`)}
                  </span>
                </Link>
              ))
            : null}
          {wantsPeople && searching ? (
            <p className="flex items-center gap-2 p-4 text-sm text-text-muted" role="status">
              <Spinner label={false} />
              {s('commandSearching')}
            </p>
          ) : null}
          {peopleFailed ? (
            <p className="p-4 text-sm text-danger" role="alert">
              {s('commandPeopleError')}
            </p>
          ) : null}
          {!searching &&
          !peopleFailed &&
          people.length === 0 &&
          available.every(
            (item) => !t(`nav.${item.key}`).toLocaleLowerCase().includes(query.toLocaleLowerCase()),
          ) ? (
            <p className="p-5 text-sm text-text-muted">
              {wantsPeople ? s('commandNothing') : s('commandEmpty')}
            </p>
          ) : null}
          {canSearchPeople && query === '' ? (
            <p className="px-4 pt-2 pb-1 text-xs text-text-muted">{s('commandPeopleHint')}</p>
          ) : null}
        </div>
      </dialog>
      <dialog
        ref={notifications}
        className="shell-dialog"
        aria-label={s('notifications')}
        {...closeOnBackdrop}
      >
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
                  href={navigationHref(item.href, childId)}
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
        <header className="workspace-topbar sticky top-0 z-30 flex items-center gap-3 border-b border-border px-4 md:px-8">
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
          <nav
            aria-label={t('breadcrumbs')}
            className="workspace-breadcrumb hidden min-w-0 items-center gap-2 text-sm md:flex"
          >
            <Link
              href={navigationHref(available[0]?.href ?? '/', childId)}
              className="shrink-0 text-text-muted hover:text-primary"
            >
              {t('nav.dashboard')}
            </Link>
            {current && current.href !== available[0]?.href ? (
              <>
                <ChevronRight className="rtl-flip size-3.5 text-text-muted" aria-hidden />
                <span aria-current="page" className="truncate font-semibold">
                  {t(`nav.${current.key}`)}
                </span>
              </>
            ) : null}
          </nav>
          <span className="min-w-0 truncate text-sm font-semibold md:hidden">
            {current ? t(`nav.${current.key}`) : s('overview')}
          </span>
          <div className="ms-auto flex items-center gap-1">
            <button
              type="button"
              aria-label={t('goToPage')}
              onClick={openCommand}
              className="flex h-9 items-center gap-3 rounded-lg px-2.5 text-text-muted transition-colors hover:bg-surface-muted md:border md:border-border md:bg-surface"
            >
              <Search className="size-4" aria-hidden />
              <span className="hidden text-sm md:block">{t('goToPage')}</span>
              <kbd
                aria-hidden
                className="hidden rounded border border-border px-1 py-0.5 font-mono text-[0.6rem] md:block"
              >
                {t('searchShortcut')}
              </kbd>
            </button>
            <button
              type="button"
              aria-label={s('notifications')}
              onClick={() => {
                notifications.current?.showModal();
              }}
              className="grid size-10 place-items-center rounded-lg text-text-muted transition-colors hover:bg-surface-muted"
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
        <main id="workspace-main" tabIndex={-1} className="workspace-main outline-none">
          {children}
        </main>
        <nav
          aria-label={s('overview')}
          className="mobile-dock fixed inset-x-0 bottom-0 z-30 flex justify-around gap-1 border-t border-border bg-surface px-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 lg:hidden"
        >
          {dockItems.map((item) => (
            <Link
              key={item.key}
              href={navigationHref(item.href, childId)}
              aria-current={current?.href === item.href ? 'page' : undefined}
              className="flex min-h-13 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs text-text-muted transition-colors hover:bg-surface-muted"
            >
              <item.icon className="size-5" strokeWidth={1.75} aria-hidden />
              {item.key === 'dashboard'
                ? t('home')
                : item.key === 'schedule'
                  ? t('scheduleShort')
                  : t(`nav.${item.key}`)}
            </Link>
          ))}
          <button
            type="button"
            aria-label={t('navigation')}
            onClick={() => {
              drawer.current?.showModal();
            }}
            className="flex min-h-13 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs text-text-muted transition-colors hover:bg-surface-muted"
          >
            <Menu className="size-5" aria-hidden />
            {t('more')}
          </button>
        </nav>
      </div>
    </div>
  );
}
