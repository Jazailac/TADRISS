import { History, KeyRound, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SectionHeading } from './section-heading';

const items = [
  { key: 'isolation', icon: ShieldCheck },
  { key: 'roles', icon: KeyRound },
  { key: 'audit', icon: History },
] as const;

export function Security() {
  const t = useTranslations('home.security');
  return (
    <section id="security" className="scroll-mt-20 border-b border-border/70">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} align="center" />
        <div className="mt-16 grid gap-10 md:grid-cols-3">
          {items.map(({ key, icon: Icon }) => (
            <div key={key} className="text-center">
              <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent ring-1 ring-accent/15 ring-inset">
                <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">
                {t(`items.${key}.title`)}
              </h3>
              <p className="mx-auto mt-2 max-w-xs leading-relaxed text-text-muted">
                {t(`items.${key}.body`)}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
