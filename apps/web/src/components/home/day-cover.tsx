import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';

/** A school journal cover: one clear priority, with a gauge derived from the real data. */
export function DayCover({
  title,
  subtitle,
  date,
  focusLabel,
  focusValue,
  focusHint,
  focusHref,
  progress,
  actions,
}: {
  title: ReactNode;
  subtitle: ReactNode;
  date: string;
  focusLabel: string;
  focusValue: ReactNode;
  focusHint: ReactNode;
  focusHref?: string;
  /** A fraction in [0, 1]; omitted when there is no meaningful total. */
  progress?: number;
  actions?: ReactNode;
}) {
  const t = useTranslations('workspace');
  const f = useFormatter();
  const fraction = progress === undefined ? undefined : Math.max(0, Math.min(1, progress));
  const circumference = 2 * Math.PI * 48;
  const day = Number(date.slice(8, 10));
  const focus = (
    <>
      <svg className="cover-architecture" viewBox="0 0 420 320" fill="none" aria-hidden>
        <path d="M84 320V184a116 116 0 0 1 232 0v136M120 320V184a80 80 0 0 1 160 0v136M158 320V184a42 42 0 0 1 84 0v136" />
        <path d="M0 284h420M0 302h420M52 320V184a148 148 0 0 1 296 0v136" />
      </svg>
      <div className="day-focus-top">
        <span className="day-focus-label">{focusLabel}</span>
        {focusHref ? <ArrowUpRight className="rtl-flip size-4" aria-hidden /> : null}
      </div>
      <div className="day-focus-reading">
        <div>
          <p className="day-focus-value font-mono tabular-nums">{focusValue}</p>
          <p className="day-focus-hint">{focusHint}</p>
        </div>
        {fraction !== undefined ? (
          <div className="day-focus-gauge">
            <svg viewBox="0 0 112 112" fill="none" aria-hidden>
              <circle className="gauge-track" cx="56" cy="56" r="48" />
              <circle
                className="gauge-value"
                cx="56"
                cy="56"
                r="48"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - fraction)}
              />
              <path
                className="gauge-mark"
                d="M43 68V48a13 13 0 0 1 26 0v20h-8V48a5 5 0 0 0-10 0v20Z"
              />
            </svg>
            <progress className="sr-only" value={fraction} max={1} aria-label={focusLabel} />
          </div>
        ) : null}
      </div>
      <span className="day-focus-footer">
        {t('day')}
        {focusHref ? (
          <>
            <span className="day-focus-rule" aria-hidden />
            <ArrowRight className="rtl-flip size-4" aria-hidden />
          </>
        ) : null}
      </span>
    </>
  );
  return (
    <header className="day-cover">
      <div className="day-cover-copy">
        <div className="day-edition">
          <span className="day-edition-rule" aria-hidden />
          <p>{t('edition')}</p>
        </div>
        <h1 className="display day-cover-title">{title}</h1>
        <p className="day-cover-subtitle">{subtitle}</p>
        <div className="day-cover-bottom">
          <div className="day-date">
            <span className="day-date-number font-mono tabular-nums">
              {f.number(day, { minimumIntegerDigits: 2 })}
            </span>
            <span className="day-date-copy">
              <span>
                {f.dateTime(new Date(`${date}T00:00:00Z`), { weekday: 'long', timeZone: 'UTC' })}
              </span>
              <span>
                {f.dateTime(new Date(`${date}T00:00:00Z`), { month: 'long', timeZone: 'UTC' })}
              </span>
            </span>
          </div>
          {actions ? <div className="day-cover-actions">{actions}</div> : null}
        </div>
      </div>
      {focusHref ? (
        <Link href={focusHref} className="day-focus">
          {focus}
        </Link>
      ) : (
        <div className="day-focus">{focus}</div>
      )}
    </header>
  );
}
