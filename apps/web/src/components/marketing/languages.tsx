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
      <div className="mx-auto grid grid-cols-1 max-w-7xl items-center gap-12 px-5 py-20 md:px-10 lg:grid-cols-2 lg:gap-24 lg:py-28">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          body={t('body')}
          className="[&_p:first-child]:text-ink-muted [&_p:last-child]:text-ink-muted"
        />
        <div className="w-full max-w-lg lg:justify-self-end">
          <div
            className="mb-6 inline-flex gap-1 rounded-lg border border-ink-muted/25 p-1"
            role="group"
            aria-label={language('label')}
          >
            {(['fr', 'ar'] as const).map((l) => (
              <button
                type="button"
                lang={l}
                key={l}
                aria-pressed={lang === l}
                onClick={() => {
                  setLang(l);
                }}
                className={`rounded-md border px-5 py-2 text-sm transition-colors ${lang === l ? 'border-ink-foreground bg-ink-foreground text-ink' : 'border-transparent text-ink-muted hover:text-ink-foreground'}`}
              >
                {language(l)}
              </button>
            ))}
          </div>
          <div
            lang={lang}
            dir={lang === 'ar' ? 'rtl' : 'ltr'}
            className="language-receipt border border-border bg-surface p-7 text-text shadow-lg sm:p-9"
          >
            <div className="flex items-center justify-between gap-3">
              <Mark className="size-7 text-primary" />
              <Badge tone="success" dot>
                {t(`sample.${lang}.status`)}
              </Badge>
            </div>
            <p className="mt-7 font-mono text-xs text-text-muted">{t(`sample.${lang}.number`)}</p>
            <p className="display mt-3 text-3xl tracking-tight">{t(`sample.${lang}.title`)}</p>
            <dl className="mt-8 grid gap-5 border-t border-border pt-6">
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
