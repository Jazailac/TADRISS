import {
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  FolderLock,
  Megaphone,
  ReceiptText,
} from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import { SectionHeading } from './section-heading';

const items = [
  { key: 'attendance', icon: CalendarCheck },
  { key: 'grades', icon: BookOpenCheck },
  { key: 'finance', icon: ReceiptText },
  { key: 'schedule', icon: CalendarClock },
  { key: 'messages', icon: Megaphone },
  { key: 'documents', icon: FolderLock },
] as const;

export function Features() {
  const t = useTranslations('home.features');
  const f = useFormatter();
  return (
    <section id="features" className="scroll-mt-24 border-y border-border bg-surface">
      <div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28">
        <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-20">
          <SectionHeading
            eyebrow={t('eyebrow')}
            title={t('title')}
            body={t('body')}
            className="lg:sticky lg:top-28 lg:self-start"
          />
          <div className="grid grid-cols-1">
            {items.map(({ key, icon: Icon }, i) => (
              <article
                key={key}
                className="feature-index group grid gap-4 border-t border-border py-7 sm:grid-cols-[2rem_1fr] sm:gap-6"
              >
                <div className="flex items-start gap-4 sm:flex-col sm:gap-3">
                  <Icon
                    className="size-5 text-primary transition-transform duration-200 group-hover:-translate-y-0.5"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <span className="font-mono text-[0.65rem] text-text-muted">
                    {f.number(i + 1, { minimumIntegerDigits: 2 })}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {t(`items.${key}.title`)}
                  </h3>
                  <p className="mt-2 max-w-lg text-sm leading-7 text-text-muted">
                    {t(`items.${key}.body`)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
