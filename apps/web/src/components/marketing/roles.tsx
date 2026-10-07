'use client';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { SectionHeading } from './section-heading';
import { WorkflowPreview } from './workflow-preview';
const roles = ['admin', 'teacher', 'student'] as const;
export function Roles() {
  const t = useTranslations('home.roles');
  const s = useTranslations('studio');
  const [role, setRole] = useState<(typeof roles)[number]>('admin');
  return (
    <section id="roles" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />
        <div className="mt-10 flex flex-wrap gap-2" role="group" aria-label={t('eyebrow')}>
          {roles.map((r) => (
            <button
              type="button"
              key={r}
              onClick={() => {
                setRole(r);
              }}
              aria-pressed={role === r}
              className={`rounded-full border px-5 py-3 text-sm transition-colors ${role === r ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-surface text-text-muted hover:border-primary'}`}
            >
              {t(`${r}.title`)}
            </button>
          ))}
        </div>
        <div className="mt-8 grid overflow-hidden rounded-3xl border border-border bg-surface lg:grid-cols-[.8fr_1.2fr]">
          <div className="p-8 md:p-12">
            <h3 className="display text-3xl">{t(`${role}.lead`)}</h3>
            <ul className="mt-7 grid gap-4">
              {(['a', 'b', 'c', 'd'] as const).map((p) => (
                <li key={p} className="flex gap-3 text-sm">
                  <Check className="size-4 shrink-0 text-primary" aria-hidden />
                  {t(`${role}.points.${p}`)}
                </li>
              ))}
            </ul>
          </div>
          <div className="border-t border-border bg-surface-muted/50 p-6 md:p-10 lg:border-s lg:border-t-0">
            <p className="mb-5 text-xs text-text-muted">{s('preview')}</p>
            <WorkflowPreview
              module={role === 'admin' ? 'finance' : role === 'teacher' ? 'attendance' : 'schedule'}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
