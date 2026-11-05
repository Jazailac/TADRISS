import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  ChartNoAxesCombined,
  ChevronRight,
  CircleDashed,
  ClipboardList,
  Megaphone,
  ReceiptText,
  UsersRound,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';

export const bdi = (chunks: ReactNode) => <bdi>{chunks}</bdi>;

const panelIcons = {
  schedule: CalendarDays,
  tasks: ClipboardList,
  news: Megaphone,
  results: ChartNoAxesCombined,
  finance: ReceiptText,
  usage: UsersRound,
};
type PanelKind = keyof typeof panelIcons;

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
    <div className="min-w-0">
      <div className="flex items-center gap-2.5">
        <span
          className={cx(
            'stat-icon grid size-8 shrink-0 place-items-center rounded-lg',
            tones[tone],
          )}
        >
          <Icon className="size-4" strokeWidth={1.75} aria-hidden />
        </span>
        <dt className="min-w-0 flex-1 text-xs font-medium text-text-muted">{label}</dt>
        {href ? (
          <ChevronRight
            className="stat-arrow rtl-flip hidden size-3.5 shrink-0 text-text-muted sm:block"
            aria-hidden
          />
        ) : null}
      </div>
      <dd
        className={cx(
          'mt-5 font-mono text-3xl leading-none tabular-nums',
          typeof value === 'string' && value.length > 10 && 'text-xl',
        )}
      >
        {value}
      </dd>
      {hint ? <p className="mt-2 text-[0.7rem] leading-relaxed text-text-muted">{hint}</p> : null}
    </div>
  );
  return (
    <Card className="dashboard-stat metric-cell min-w-0 p-5">
      {href ? (
        <Link href={href} className="dashboard-stat-link rounded-md">
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
  kind,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
  className?: string;
  kind?: PanelKind;
}) {
  const Icon = kind ? panelIcons[kind] : null;
  return (
    <Card className={cx('dashboard-panel min-w-0', kind && `dashboard-${kind}`, className)}>
      <div className="dashboard-panel-header">
        <div>
          {Icon ? (
            <span className="panel-emblem" aria-hidden>
              <Icon className="size-3.5" strokeWidth={1.5} />
            </span>
          ) : null}
          <h2 className="font-semibold">{title}</h2>
        </div>
        {href && linkLabel ? (
          <Link
            href={href}
            className="inline-flex shrink-0 items-center gap-1 rounded-md py-1 text-xs font-medium text-primary hover:underline"
          >
            {linkLabel}
            <ChevronRight className="rtl-flip size-4" aria-hidden />
          </Link>
        ) : null}
      </div>
      <div className="dashboard-panel-body">{children}</div>
    </Card>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return (
    <p className="empty-line">
      <CircleDashed className="size-6 shrink-0 text-primary/60" strokeWidth={1.25} aria-hidden />
      <span>{children}</span>
    </p>
  );
}
