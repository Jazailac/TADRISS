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
    <section id="security" className="scroll-mt-24 border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:px-10 lg:grid-cols-2 lg:gap-24 lg:py-28">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />
        <div className="divide-y divide-border">
          {items.map(({ key, icon: Icon }) => (
            <div key={key} className="flex gap-5 py-7 first:pt-0 last:pb-0">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-surface text-primary">
                <Icon className="size-5" strokeWidth={1.5} aria-hidden />
              </span>
              <div>
                <h3 className="text-base font-semibold tracking-tight">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="mt-2 max-w-md text-sm leading-7 text-text-muted">
                  {t(`items.${key}.body`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
