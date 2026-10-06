import { Check } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { SectionHeading } from './section-heading';

const roles = ['admin', 'teacher', 'student'] as const;
const points = ['a', 'b', 'c', 'd'] as const;

export function Roles() {
  const t = useTranslations('home.roles');
  const format = useFormatter();
  return (
    <section id="roles" className="scroll-mt-20">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />
        <div className="mt-14 grid overflow-hidden rounded-2xl border border-border bg-border/80 md:grid-cols-3 md:gap-px">
          {roles.map((r, i) => (
            <article
              key={r}
              className="border-b border-border bg-surface p-8 last:border-b-0 md:border-b-0"
            >
              <span className="font-mono text-xs text-accent tabular-nums">
                {format.number(i + 1, { minimumIntegerDigits: 2 })}
              </span>
              <h3 className="display mt-3 text-2xl font-medium">{t(`${r}.title`)}</h3>
              <p className="mt-2 text-sm text-text-muted">{t(`${r}.lead`)}</p>
              <ul className="mt-6 grid gap-3">
                {points.map((p) => (
                  <li key={p} className="flex gap-3 text-[0.9375rem]">
                    <Check
                      className="mt-1 size-4 shrink-0 text-primary"
                      strokeWidth={2.25}
                      aria-hidden
                    />
                    {t(`${r}.points.${p}`)}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
