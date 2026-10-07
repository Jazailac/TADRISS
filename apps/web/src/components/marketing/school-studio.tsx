'use client';

import { ArrowRight, Check, GraduationCap, ShieldCheck } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { ButtonLink } from '../ui/button';
import { Mark } from '../ui/logo';
import { WorkflowPreview, type Module } from './workflow-preview';

const types = ['primary', 'college', 'lycee', 'support'] as const;
const modules: Module[] = ['attendance', 'grades', 'schedule', 'finance'];
export function SchoolStudio() {
  const t = useTranslations('studio');
  const role = useTranslations('home.roles');
  const [school, setSchool] = useState<(typeof types)[number]>('lycee');
  const [selected, setSelected] = useState<Module[]>(['attendance', 'schedule']);
  const [active, setActive] = useState<Module>('attendance');
  const [viewer, setViewer] = useState<'admin' | 'teacher' | 'student'>('admin');
  const f = useFormatter();
  function toggle(module: Module) {
    setSelected((current) =>
      current.includes(module) ? current.filter((m) => m !== module) : [...current, module],
    );
    setActive(module);
  }
  return (
    <div className="school-studio" id="school-studio">
      <div className="studio-scene" data-school={school} data-module={active}>
        <div className="studio-arch" aria-hidden />
        <div className="studio-frame">
          <div className="studio-window-bar">
            <Mark className="size-5 text-primary" />
            <span>{t('school')}</span>
            <span className="ms-auto rounded-full bg-primary-soft px-2 py-1 text-xs text-primary">
              {t(school)}
            </span>
          </div>
          <div className="px-4 pt-5 md:px-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">{role(`${viewer}.title`)}</p>
              <span className="font-mono text-xs text-text-muted">
                {f.number(selected.length, { minimumIntegerDigits: 2 })}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-muted">{role(`${viewer}.lead`)}</p>
          </div>
          <div className="p-4 md:p-6">
            <WorkflowPreview module={active} />
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-border px-4 py-3 md:px-6">
            {modules.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={selected.includes(m)}
                onClick={() => {
                  toggle(m);
                }}
                className={`studio-module ${selected.includes(m) ? 'is-selected' : ''}`}
              >
                <Check className="size-3" aria-hidden />
                {t(m)}
              </button>
            ))}
          </div>
        </div>
        <div className="studio-floating-note">
          <ShieldCheck className="size-4" aria-hidden />
          <span>{t('protected')}</span>
        </div>
      </div>
      <div className="studio-controls">
        <fieldset>
          <legend>{t('schoolType')}</legend>
          <div className="flex flex-wrap gap-1.5">
            {types.map((type) => (
              <label key={type} className={`studio-option ${school === type ? 'is-selected' : ''}`}>
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
                {t(type)}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="flex items-center justify-between gap-4 text-xs text-ink-muted">
          <span>{t('roles')}</span>
          <select
            value={viewer}
            onChange={(event) => {
              setViewer(event.target.value as typeof viewer);
            }}
            className="rounded-md border border-ink-muted/40 bg-ink px-3 py-2 text-ink-foreground"
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
          variant="secondary"
          className="w-full justify-between"
        >
          {t('create')}
          <ArrowRight className="rtl-flip size-4" aria-hidden />
        </ButtonLink>
        <p className="flex items-center justify-center gap-2 text-center text-[0.65rem] text-ink-muted">
          <GraduationCap className="size-3.5 shrink-0" aria-hidden />
          {t('preview')}
        </p>
      </div>
    </div>
  );
}
