import { useTranslations } from 'next-intl';
import { Badge } from '../ui/badge';
import { ZelligePattern } from '../ui/pattern';
import { SectionHeading } from './section-heading';

/** Shows the same receipt line in French and Arabic, side by side, to make RTL tangible. */
export function Languages() {
  const t = useTranslations('home.languages');
  const samples = [
    { lang: 'fr', dir: 'ltr' },
    { lang: 'ar', dir: 'rtl' },
  ] as const;
  // `dark` scopes the dark token set to this section, so badges and borders match the ink surface.
  return (
    <section className="dark relative isolate overflow-hidden bg-ink text-ink-foreground">
      <ZelligePattern className="-z-10 text-ink-foreground/[0.05]" size={72} />
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-24 md:px-8 md:py-32 lg:grid-cols-2">
        <SectionHeading
          eyebrow={t('eyebrow')}
          title={t('title')}
          body={t('body')}
          className="[&_p:last-child]:text-ink-muted"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          {samples.map(({ lang, dir }) => (
            <div
              key={lang}
              lang={lang}
              dir={dir}
              className="rounded-xl border border-ink-foreground/10 bg-ink-foreground/[0.04] p-6 backdrop-blur"
            >
              <p className="font-mono text-xs text-ink-muted">{t(`sample.${lang}.number`)}</p>
              <p className="display mt-3 text-2xl">{t(`sample.${lang}.title`)}</p>
              <dl className="mt-5 grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">{t(`sample.${lang}.studentLabel`)}</dt>
                  <dd>{t(`sample.${lang}.student`)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-muted">{t(`sample.${lang}.amountLabel`)}</dt>
                  <dd className="font-mono tabular-nums">{t(`sample.${lang}.amount`)}</dd>
                </div>
              </dl>
              <Badge tone="success" dot className="mt-5">
                {t(`sample.${lang}.status`)}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
