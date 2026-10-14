import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';

export const bdi = (chunks: ReactNode) => <bdi>{chunks}</bdi>;

type Tone = 'primary' | 'accent' | 'info' | 'success' | 'warning' | 'danger';
const tones: Record<Tone, string> = {
  primary: 'bg-primary-soft text-primary',
  accent: 'bg-accent-soft text-accent',
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

/** One number that matters, optionally a link to where it can be acted on. */
export function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone = 'primary',
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  href?: string;
  tone?: Tone;
}) {
  const body = (
    <div className="flex items-start gap-4">
      <span className={cx('grid size-11 shrink-0 place-items-center rounded-lg', tones[tone])}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <dt className="text-sm text-text-muted">{label}</dt>
        <dd className="mt-0.5 font-mono text-2xl tabular-nums">{value}</dd>
        {hint ? <p className="mt-0.5 text-xs text-text-muted">{hint}</p> : null}
      </div>
    </div>
  );
  return (
    <Card className={cx('min-w-0 p-5', href && 'transition-shadow hover:shadow-md')}>
      {href ? (
        <Link href={href} className="block rounded-lg focus-visible:outline-2">
          {body}
        </Link>
      ) : (
        body
      )}
    </Card>
  );
}

/** A titled card with an optional "see all" link. */
export function Panel({
  title,
  href,
  linkLabel,
  children,
  className,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cx('min-w-0 p-6', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">{title}</h2>
        {href && linkLabel ? (
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {linkLabel}
            <ChevronRight className="rtl-flip size-4" aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="rounded-lg bg-surface-muted p-4 text-sm text-text-muted">{children}</p>;
}
