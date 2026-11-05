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
import { useState } from 'react';
import { ButtonLink } from '../ui/button';
import { Mark } from '../ui/logo';
import { WorkflowPreview, type Module } from './workflow-preview';

const types = ['primary', 'college', 'lycee', 'support'] as const;
const modules: Module[] = ['attendance', 'grades', 'schedule', 'finance'];
const icons = {
  attendance: CalendarCheck,
  grades: BookOpenCheck,
  schedule: CalendarClock,
  finance: ReceiptText,
};

export function SchoolStudio() {
  const t = useTranslations('studio');
  const role = useTranslations('home.roles');
  const preview = useTranslations('home.preview');
  const [school, setSchool] = useState<(typeof types)[number]>('lycee');
  const [selected, setSelected] = useState<Module[]>(['attendance', 'schedule']);
  const [active, setActive] = useState<Module>('attendance');
  const [viewer, setViewer] = useState<'admin' | 'teacher' | 'student'>('admin');
  const f = useFormatter();
  const locale = useLocale();

  function toggle(module: Module) {
    setSelected((current) =>
      current.includes(module) ? current.filter((m) => m !== module) : [...current, module],
    );
    setActive(module);
  }

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
        <aside className="studio-navigation">
          <div className="hidden lg:block">
            <Mark className="size-8 text-ink-foreground" />
            <p className="mt-6 text-sm font-semibold leading-6 text-ink-foreground">
              {preview('school')}
            </p>
            <p className="mt-1 text-xs text-ink-muted">{t(school)}</p>
          </div>
          <fieldset className="min-w-0 lg:mt-10">
            <legend className="mb-3 text-[0.6875rem] text-ink-muted">{t('modules')}</legend>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-1">
              {modules.map((module) => {
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
          <div className="flex items-center justify-between gap-3 border-b border-border pb-5">
            <p className="text-xs text-text-muted">{role(`${viewer}.title`)}</p>
            <span className="font-mono text-[0.6875rem] text-text-muted">
              {f.number(selected.length, { minimumIntegerDigits: 2 })}
              <span className="ms-1.5">{t('modules')}</span>
            </span>
          </div>
          <div className="py-6">
            <p className="eyebrow text-accent">{preview('today')}</p>
            <h2 className="display mt-3 max-w-lg text-3xl leading-tight tracking-tight sm:text-4xl">
              {role(`${viewer}.lead`)}
            </h2>
          </div>
          <div id="studio-workflow" className="studio-workflow" aria-live="polite">
            <WorkflowPreview module={active} />
          </div>
          <dl className="mt-6 grid grid-cols-[.8fr_.65fr_1.55fr] divide-x divide-border border-t border-border pt-5 sm:grid-cols-3 rtl:divide-x-reverse">
            <div className="min-w-0 pe-3">
              <dt className="truncate text-[0.625rem] text-text-muted">{preview('attendance')}</dt>
              <dd className="mt-2 font-mono text-lg font-medium tabular-nums sm:text-xl">
                {f.number(0.96, { style: 'percent' })}
              </dd>
            </div>
            <div className="min-w-0 px-3">
              <dt className="truncate text-[0.625rem] text-text-muted">{preview('students')}</dt>
              <dd className="mt-2 font-mono text-lg font-medium tabular-nums sm:text-xl">
                {f.number(31)}
              </dd>
            </div>
            <div className="min-w-0 ps-3">
              <dt className="truncate text-[0.625rem] text-text-muted">{preview('collected')}</dt>
              <dd className="mt-2 whitespace-nowrap font-mono text-xs font-medium tabular-nums sm:text-base">
                {formatMoney(180000, locale)}
              </dd>
            </div>
          </dl>
        </div>
        <div className="studio-controls">
          <div className="studio-config-heading">
            <p className="eyebrow text-accent">{t('selected')}</p>
          </div>
          <fieldset className="min-w-0">
            <legend>{t('schoolType')}</legend>
            <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
              {types.map((type) => (
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
                      setSchool(type);
                    }}
                  />
                  <span className="studio-radio" aria-hidden />
                  {t(type)}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="grid gap-2 text-xs text-text-muted">
            <span>{t('roles')}</span>
            <select
              value={viewer}
              onChange={(event) => {
                setViewer(event.target.value as typeof viewer);
              }}
              className="h-11 min-w-0 rounded-md border border-border-strong bg-surface px-3 text-base text-text md:h-10 md:text-sm"
            >
              {(['admin', 'teacher', 'student'] as const).map((r) => (
                <option key={r} value={r}>
                  {role(`${r}.title`)}
                </option>
              ))}
            </select>
          </label>
          <ButtonLink
            href={{
              pathname: '/signup',
              query: { schoolType: school, modules: selected.join(','), role: viewer },
            }}
            className="mt-auto w-full justify-between"
          >
            {t('create')}
            <ArrowRight className="rtl-flip size-4" aria-hidden />
          </ButtonLink>
        </div>
      </div>
      <p className="studio-config-note">{t('configNote')}</p>
    </div>
  );
}
