'use client';
import { useEffect, useRef, useState } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { WorkflowPreview, type Module } from './workflow-preview';
const modules: Module[] = ['attendance', 'grades', 'schedule', 'finance'];
export function DayStory() {
  const t = useTranslations('studio');
  const features = useTranslations('home.features.items');
  const f = useFormatter();
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState<Module>('attendance');
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce), (max-width: 767px)').matches) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) setActive(entry.target.getAttribute('data-module') as Module);
      },
      { rootMargin: '-30% 0px -40% 0px' },
    );
    root.current?.querySelectorAll('[data-module]').forEach((item) => {
      observer.observe(item);
    });
    return () => {
      observer.disconnect();
    };
  }, []);
  return (
    <section ref={root} className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
      <div className="max-w-2xl">
        <p className="eyebrow">{t('scroll')}</p>
        <h2 className="display mt-5 text-[length:var(--type-title)]">{t('storyTitle')}</h2>
        <p className="mt-5 max-w-xl leading-relaxed text-text-muted">{t('storyBody')}</p>
      </div>
      <div className="mt-14 grid gap-12 md:grid-cols-2 md:gap-20">
        <div>
          {modules.map((module, i) => (
            <article
              key={module}
              data-module={module}
              className="story-chapter border-s border-border ps-6 pb-12 md:min-h-64 md:ps-8"
            >
              <span className="font-mono text-xs text-accent">
                {f.number(i + 1, { minimumIntegerDigits: 2 })}
              </span>
              <h3 className="display mt-4 text-3xl">{features(`${module}.title`)}</h3>
              <p className="mt-4 leading-relaxed text-text-muted">{features(`${module}.body`)}</p>
              <div className="story-fallback mt-7 rounded-xl border border-border bg-surface p-4">
                <WorkflowPreview module={module} />
              </div>
            </article>
          ))}
        </div>
        <div className="story-sticky hidden md:block">
          <div className="sticky top-32 rounded-[2rem] border border-border bg-surface-muted/50 p-6 shadow-lg">
            <p className="mb-5 text-xs text-text-muted">{t('preview')}</p>
            <WorkflowPreview module={active} />
            <div className="mt-5 flex gap-2">
              {modules.map((module) => (
                <button
                  type="button"
                  key={module}
                  aria-label={t(module)}
                  aria-pressed={active === module}
                  onClick={() => {
                    setActive(module);
                  }}
                  className={`h-6 flex-1 rounded-full ${active === module ? 'bg-primary' : 'bg-border'}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
