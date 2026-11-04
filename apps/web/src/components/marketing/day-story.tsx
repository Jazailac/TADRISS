'use client';

import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { WorkflowPreview, type Module } from './workflow-preview';

const modules: Module[] = ['attendance', 'grades', 'schedule', 'finance'];

export function DayStory() {
  const t = useTranslations('studio');
  const features = useTranslations('home.features.items');
  const f = useFormatter();
  const [active, setActive] = useState<Module>('attendance');

  return (
    <section className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:gap-24">
        <div>
          <p className="eyebrow text-accent">{t('scroll')}</p>
          <h2 className="display mt-5 max-w-xl text-[length:var(--type-title)] leading-tight">
            {t('storyTitle')}
          </h2>
        </div>
        <p className="max-w-md text-base leading-7 text-text-muted">{t('storyBody')}</p>
      </div>
      <div className="mt-12 grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
        <div className="grid content-start gap-2" role="group" aria-label={t('modules')}>
          {modules.map((module, i) => (
            <button
              type="button"
              key={module}
              aria-pressed={active === module}
              aria-controls="day-workflow-preview"
              onClick={() => {
                setActive(module);
              }}
              className="marketing-chapter group flex gap-4 border-b border-border py-5 text-start sm:gap-6 sm:py-6"
            >
              <span className="chapter-number w-10 shrink-0 pt-1 font-mono text-xl text-text-muted transition-colors sm:w-12 sm:text-2xl">
                {f.number(i + 1, { minimumIntegerDigits: 2 })}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold tracking-tight">
                  {features(`${module}.title`)}
                </span>
                <span className="mt-2 block text-sm leading-6 text-text-muted">
                  {features(`${module}.body`)}
                </span>
              </span>
              <ArrowUpRight
                className="rtl-flip mt-1 size-4 shrink-0 text-text-muted transition-colors group-hover:text-primary"
                aria-hidden
              />
            </button>
          ))}
        </div>
        <div className="story-product relative min-w-0 self-center p-5 sm:p-8 lg:p-10">
          <div className="mb-7 flex items-center justify-between gap-3 border-b border-ink-muted/25 pb-5">
            <p className="text-[0.6875rem] text-ink-muted">{t('preview')}</p>
            <span className="font-mono text-sm text-ink-foreground" aria-hidden>
              {f.number(modules.indexOf(active) + 1, { minimumIntegerDigits: 2 })}
            </span>
          </div>
          <div
            id="day-workflow-preview"
            className="min-h-72 rounded-lg border border-border bg-background p-4 text-text sm:p-7"
            aria-live="polite"
          >
            <WorkflowPreview module={active} />
          </div>
          <div className="mt-6 flex gap-1.5" aria-hidden>
            {modules.map((module) => (
              <span
                key={module}
                className={`h-px flex-1 transition-colors ${active === module ? 'bg-ink-foreground' : 'bg-ink-muted/25'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
