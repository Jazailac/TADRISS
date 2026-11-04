'use client';

import { ArrowUpRight, Check, GraduationCap, HeartHandshake, School, Users } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SectionHeading } from './section-heading';
import { WorkflowPreview } from './workflow-preview';

const roles = [
  { key: 'admin', icon: School },
  { key: 'teacher', icon: Users },
  { key: 'student', icon: GraduationCap },
  { key: 'parent', icon: HeartHandshake },
] as const;

export function Roles() {
  const t = useTranslations('home.roles');
  const s = useTranslations('studio');
  const [role, setRole] = useState<(typeof roles)[number]['key']>('admin');
  return (
    <section id="roles" className="scroll-mt-24">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />
        <div
          className="mt-10 grid grid-cols-4 border-b border-border"
          role="group"
          aria-label={t('eyebrow')}
        >
          {roles.map(({ key, icon: Icon }) => (
            <button
              type="button"
              key={key}
              onClick={() => {
                setRole(key);
              }}
              aria-pressed={role === key}
              aria-controls="role-workspace-preview"
              className={`-mb-px flex items-center justify-center gap-2 border-b-2 px-2 py-4 text-xs font-medium transition-colors sm:justify-start sm:px-5 sm:text-sm ${role === key ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:border-border-strong hover:text-text'}`}
            >
              <Icon className="hidden size-4 sm:block" strokeWidth={1.75} aria-hidden />
              {t(`${key}.title`)}
              <ArrowUpRight className="rtl-flip ms-auto hidden size-4 lg:block" aria-hidden />
            </button>
          ))}
        </div>
        <div
          id="role-workspace-preview"
          className="mt-8 grid gap-8 lg:grid-cols-[.85fr_1.15fr] lg:gap-16"
          aria-live="polite"
        >
          <div className="py-5 lg:py-10">
            <h3 className="display max-w-sm text-3xl leading-tight sm:text-4xl">
              {t(`${role}.lead`)}
            </h3>
            <ul className="mt-8 grid gap-4">
              {(['a', 'b', 'c', 'd'] as const).map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm leading-6">
                  <Check className="mt-1 size-4 shrink-0 text-primary" aria-hidden />
                  {t(`${role}.points.${point}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="role-workspace min-w-0 border-s border-border bg-surface p-5 md:p-9">
            <p className="mb-6 border-b border-border pb-4 text-xs text-text-muted">
              {s('preview')}
            </p>
            <WorkflowPreview
              module={role === 'admin' ? 'finance' : role === 'teacher' ? 'attendance' : 'schedule'}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
