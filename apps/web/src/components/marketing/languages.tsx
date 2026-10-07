'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '../ui/badge';
import { Mark } from '../ui/logo';
import { SectionHeading } from './section-heading';
export function Languages() {
  const t = useTranslations('home.languages');
  const s = useTranslations('studio');
  const language = useTranslations('locale');
  const [lang, setLang] = useState<'fr' | 'ar'>('fr');
  return (
    <section className="auth-architecture">
      <div className="mx-auto grid grid-cols-1 max-w-6xl items-center gap-14 px-5 py-24 md:px-8 lg:grid-cols-2">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          body={t('body')}
          className="[&_p:first-child]:text-ink-muted [&_p:last-child]:text-ink-muted"
        />
        <div>
          <div className="mb-5 flex gap-2" role="group" aria-label={language('label')}>
            {(['fr', 'ar'] as const).map((l) => (
              <button
                type="button"
                lang={l}
                key={l}
                aria-pressed={lang === l}
                onClick={() => {
                  setLang(l);
                }}
                className={`rounded-full border px-5 py-2 text-sm ${lang === l ? 'border-ink-foreground bg-ink-foreground text-ink' : 'border-ink-muted/50 text-ink-muted'}`}
              >
                {language(l)}
              </button>
            ))}
          </div>
          <div
            lang={lang}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            className="rounded-2xl border border-border bg-surface p-7 text-text shadow-lg sm:p-9"
          >
            <div className="flex items-center justify-between gap-3">
              <Mark className="size-7 text-primary" />
              <Badge tone="success" dot>
                {t(`sample.${lang}.status`)}
              </Badge>
            </div>
            <p className="mt-7 font-mono text-xs text-text-muted">{t(`sample.${lang}.number`)}</p>
            <p className="display mt-3 text-3xl">{t(`sample.${lang}.title`)}</p>
            <dl className="mt-7 grid gap-4 border-t border-dashed border-border pt-5">
              <div className="flex justify-between gap-4 text-sm">
                <dt className="text-text-muted">{t(`sample.${lang}.studentLabel`)}</dt>
                <dd>{t(`sample.${lang}.student`)}</dd>
              </div>
              <div className="flex justify-between gap-4 text-sm">
                <dt className="text-text-muted">{t(`sample.${lang}.amountLabel`)}</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {t(`sample.${lang}.amount`)}
                </dd>
              </div>
            </dl>
          </div>
          <p className="mt-4 text-xs text-ink-muted">{s('preview')}</p>
        </div>
      </div>
    </section>
  );
}
