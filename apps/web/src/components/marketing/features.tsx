import {
  BookOpenCheck,
  CalendarCheck,
  CalendarClock,
  FolderLock,
  Megaphone,
  ReceiptText,
  type LucideIcon,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';
import { AttendanceVisual, ReadReceiptVisual, ScheduleVisual } from './feature-visuals';
import { SectionHeading } from './section-heading';

import type { Messages } from '@/i18n/messages';

const items: {
  key: keyof Messages['home']['features']['items'];
  icon: LucideIcon;
  span?: string;
  visual?: () => React.ReactNode;
}[] = [
  { key: 'attendance', icon: CalendarCheck, span: 'lg:col-span-2', visual: AttendanceVisual },
  { key: 'grades', icon: BookOpenCheck },
  { key: 'finance', icon: ReceiptText },
  { key: 'schedule', icon: CalendarClock, span: 'lg:col-span-2', visual: ScheduleVisual },
  { key: 'messages', icon: Megaphone, span: 'lg:col-span-2', visual: ReadReceiptVisual },
  { key: 'documents', icon: FolderLock },
];

export function Features() {
  const t = useTranslations('home.features');
  return (
    <section id="features" className="scroll-mt-20 border-t border-border/70 bg-surface/50">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <SectionHeading eyebrow={t('eyebrow')} title={t('title')} body={t('body')} />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ key, icon: Icon, span, visual: Visual }) => (
            <Card
              key={key}
              className={cx(
                'group relative overflow-hidden p-7 transition-[transform,box-shadow] hover:-translate-y-1 hover:shadow-md',
                span,
                Visual && 'lg:grid lg:grid-cols-[1fr_1.1fr] lg:items-center lg:gap-8',
              )}
            >
              <div>
                <span
                  className={cx(
                    'inline-flex size-11 items-center justify-center rounded-lg',
                    key === 'finance'
                      ? 'bg-accent-soft text-accent'
                      : key === 'grades'
                        ? 'bg-info-soft text-info'
                        : 'bg-primary-soft text-primary',
                  )}
                >
                  <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="mt-6 text-lg font-semibold tracking-tight">
                  {t(`items.${key}.title`)}
                </h3>
                <p className="mt-2 max-w-md leading-relaxed text-text-muted">
                  {t(`items.${key}.body`)}
                </p>
              </div>
              {Visual ? (
                <div className="mt-6 lg:mt-0">
                  <Visual />
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
