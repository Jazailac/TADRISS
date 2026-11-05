'use client';

import {
  ArrowRight,
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  Check,
  ReceiptText,
  ShieldCheck,
} from 'lucide-react';
import { formatMoney } from '@tadriss/shared';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useState, useSyncExternalStore } from 'react';
import { ButtonLink } from '../ui/button';
import { Mark } from '../ui/logo';
import { WorkflowPreview, type Module } from './workflow-preview';
import {
  defaultModules,
  kindOf,
  modulesFor,
  parseStudioQuery,
  schoolTypes,
  statsFor,
  viewers,
  type SchoolType,
  type StatValue,
  type Viewer,
} from './studio-profile';

// Amounts and marks are the longest figures, so they get a smaller size on phones.
const statSize: Record<StatValue['kind'], string> = {
  money: 'text-xs sm:text-base',
  mark: 'text-xs sm:text-base',
  percent: 'text-lg sm:text-xl',
  count: 'text-lg sm:text-xl',
  time: 'text-lg sm:text-xl',
};

const icons = {
  attendance: CalendarCheck,
  grades: BookOpenCheck,
  schedule: CalendarClock,
  finance: ReceiptText,
};

// The address bar is read as an external store: the server renders the defaults, the browser
// then shows what `?type=…&role=…` asks for, with no hydration mismatch.
function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
  };
}
const browserQuery = () => window.location.search;
const serverQuery = () => '';

/** Keeps the visitor's choice in the address, so the link they copy opens the same view. */
function remember(name: 'type' | 'role', value: string) {
  const url = new URL(window.location.href);
  url.searchParams.set(name, value);
  // Next's docs pass null: that path syncs the router (useSearchParams) and keeps its own state.
  window.history.replaceState(null, '', url);
}

export function SchoolStudio() {
  const t = useTranslations('studio');
  const preview = useTranslations('home.preview');
  const f = useFormatter();
  const locale = useLocale();
  const fromLink = parseStudioQuery(useSyncExternalStore(subscribe, browserQuery, serverQuery));
  const [typeChoice, setType] = useState<SchoolType | null>(null);
  const [viewerChoice, setViewer] = useState<Viewer | null>(null);
  // null until the visitor picks modules themselves: until then they follow the school type.
  const [picked, setPicked] = useState<Module[] | null>(null);
  const [activeChoice, setActive] = useState<Module | null>(null);

  const school = typeChoice ?? fromLink.type ?? 'lycee';
  const viewer = viewerChoice ?? fromLink.viewer ?? 'admin';
  const kind = kindOf(school);
  const available = modulesFor(viewer);
  const selected = (picked ?? defaultModules(school)).filter((m) => available.includes(m));
  const active =
    activeChoice && available.includes(activeChoice)
      ? activeChoice
      : (selected[0] ?? available[0] ?? 'attendance');

  function toggle(module: Module) {
    // Work on the full choice, not the filtered one: a teacher's view hides fees, and toggling
    // a module there must not drop fees from what the director picked.
    const current = picked ?? defaultModules(school);
    setPicked(
      current.includes(module) ? current.filter((m) => m !== module) : [...current, module],
    );
    setActive(module);
  }

  function show(value: StatValue) {
    switch (value.kind) {
      case 'percent':
        return f.number(value.value, { style: 'percent' });
      case 'count':
        return f.number(value.value);
      case 'money':
        return formatMoney(value.centimes, locale);
      case 'mark':
        return `${f.number(value.value)} / ${f.number(value.outOf)}`;
      case 'time':
        return f.dateTime(new Date(Date.UTC(2026, 9, 5, value.hour)), {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        });
    }
  }

  const signup = {
    pathname: '/signup' as const,
    // The school's whole choice, not what this viewer happens to see.
    query: {
      schoolType: school,
      modules: (picked ?? defaultModules(school)).join(','),
      role: viewer,
    },
  };

  return (
    <div className="school-studio" id="school-studio">
      <div className="studio-window-bar">
        <span className="hidden items-center gap-1.5 sm:flex" aria-hidden>
          {[0, 1, 2].map((dot) => (
            <span key={dot} className="size-1.5 rounded-full border border-border-strong" />
          ))}
        </span>
        <span className="min-w-0 flex-1 truncate text-center">{t('preview')}</span>
        <ShieldCheck className="size-3.5 shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
      </div>
      <div className="studio-cockpit">
        <div className="studio-controls">
          <div className="studio-config-heading">
            <p className="eyebrow text-accent">{t('selected')}</p>
          </div>
          <fieldset className="min-w-0">
            <legend>{t('schoolType')}</legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-1">
              {schoolTypes.map((type) => (
                <label
                  key={type}
                  className={`studio-option ${school === type ? 'is-selected' : ''}`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="school-type"
                    value={type}
                    checked={school === type}
                    onChange={() => {
                      setType(type);
                      remember('type', type);
                    }}
                  />
                  <span className="studio-radio" aria-hidden />
                  {t(type)}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <aside className="studio-navigation">
          <div className="hidden lg:block">
            <Mark className="size-8 text-ink-foreground" />
            <p className="mt-6 text-sm font-semibold leading-6 text-ink-foreground">
              {t('sampleName', { kind })}
            </p>
            <p className="mt-1 text-xs text-ink-muted">{t(school)}</p>
          </div>
          <fieldset className="min-w-0 lg:mt-10">
            <legend className="mb-3 text-[0.6875rem] text-ink-muted">{t('modules')}</legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-1">
              {available.map((module) => {
                const Icon = icons[module];
                return (
                  <button
                    key={module}
                    type="button"
                    aria-pressed={selected.includes(module)}
                    aria-controls="studio-workflow"
                    onClick={() => {
                      toggle(module);
                    }}
                    className={`studio-module ${selected.includes(module) ? 'is-selected' : ''} ${active === module ? 'is-active' : ''}`}
                  >
                    <Icon className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                    <span className="min-w-0 flex-1">{t(module)}</span>
                    {selected.includes(module) ? (
                      <Check className="size-3 shrink-0" aria-hidden />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <p className="mt-auto hidden items-center gap-2 border-t border-ink-muted/20 pt-5 text-[0.625rem] leading-5 text-ink-muted lg:flex">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            {t('protected')}
          </p>
        </aside>
        <div className="studio-desktop">
          <fieldset className="min-w-0 border-b border-border pb-5">
            <legend className="mb-2.5 text-[0.6875rem] text-text-muted">{t('roles')}</legend>
            <div className="studio-viewers">
              {viewers.map((r) => (
                <label key={r} className={`studio-viewer ${viewer === r ? 'is-selected' : ''}`}>
                  <input
                    className="sr-only"
                    type="radio"
                    name="studio-viewer"
                    value={r}
                    checked={viewer === r}
                    onChange={() => {
                      setViewer(r);
                      remember('role', r);
                    }}
                  />
                  {t(`viewer.${r}`)}
                </label>
              ))}
            </div>
          </fieldset>
          <div className="py-6">
            <p className="eyebrow text-accent">{preview('today')}</p>
            <h2 className="display mt-3 max-w-lg text-3xl leading-tight tracking-tight sm:text-4xl">
              {t(`lead.${viewer}`, { kind })}
            </h2>
          </div>
          <div id="studio-workflow" className="studio-workflow" aria-live="polite">
            <WorkflowPreview module={active} type={school} viewer={viewer} />
          </div>
          <dl className="mt-6 grid grid-cols-[.8fr_1.1fr_1.3fr] divide-x divide-border border-t border-border pt-5 sm:grid-cols-3 rtl:divide-x-reverse">
            {statsFor(school, viewer).map(({ key, value }, i) => (
              <div key={key} className={`min-w-0 ${['pe-3', 'px-3', 'ps-3'][i] ?? ''}`}>
                <dt className="truncate text-[0.625rem] text-text-muted">
                  {t(`stats.${key}`, { kind })}
                </dt>
                <dd
                  className={`mt-2 whitespace-nowrap font-mono font-medium tabular-nums ${statSize[value.kind]}`}
                >
                  {show(value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="studio-cta">
          <ButtonLink href={signup} className="w-full justify-between">
            {t('createFor', { kind })}
            <ArrowRight className="rtl-flip size-4" aria-hidden />
          </ButtonLink>
        </div>
      </div>
      <p className="studio-config-note">{t('configNote')}</p>
    </div>
  );
}
