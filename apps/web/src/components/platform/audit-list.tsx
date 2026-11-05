import type { AuditEntry } from '@tadriss/shared';
import { Activity, Building2, CreditCard, PanelsTopLeft, UserRound } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Badge } from '../ui/badge';
import { cx } from '../ui/cx';

const n = (chunks: React.ReactNode) => <bdi>{chunks}</bdi>;

/** Actions that have a translated label (the log may hold others, shown by their raw name). */
const labelled = [
  'institution.plan_changed',
  'institution.suspended',
  'institution.restored',
  'institution.updated',
  'member.deactivated',
  'member.reactivated',
  'payment.voided',
  'invoice.voided',
  'module.toggled',
] as const;
const isLabelled = (a: string): a is (typeof labelled)[number] =>
  (labelled as readonly string[]).includes(a);

/** One audit entry as a sentence-like row. Unknown actions fall back to their raw name. */
export async function AuditList({
  entries,
  showSchool,
  timeZone = 'UTC',
}: {
  entries: AuditEntry[];
  showSchool: boolean;
  timeZone?: string;
}) {
  const [t, f] = await Promise.all([getTranslations('audit'), getFormatter()]);
  const detail = (e: AuditEntry): string | null => {
    const d = e.details;
    const str = (k: string) => (typeof d[k] === 'string' ? d[k] : null);
    if (e.action === 'institution.plan_changed')
      return t('detail.plan', { from: str('from') ?? '', to: str('to') ?? '' });
    if (e.action === 'module.toggled')
      return t('detail.module', {
        module: str('module') ?? '',
        role: str('role') ?? '',
        state: d.enabled === true ? t('detail.on') : t('detail.off'),
      });
    if (e.action === 'payment.voided' || e.action === 'invoice.voided') {
      const ref = str('receipt') ?? str('number') ?? '';
      const reason = str('reason');
      return reason ? t('detail.voided', { ref, reason }) : ref;
    }
    return null;
  };

  return (
    <ul className="grid grid-cols-1 divide-y divide-border">
      {entries.map((e) => {
        const extra = detail(e);
        const Icon = e.action.startsWith('institution.')
          ? Building2
          : e.action.startsWith('member.')
            ? UserRound
            : e.action.startsWith('payment.') || e.action.startsWith('invoice.')
              ? CreditCard
              : e.action.startsWith('module.')
                ? PanelsTopLeft
                : Activity;
        const attention =
          e.action.endsWith('.voided') ||
          e.action === 'institution.suspended' ||
          e.action === 'member.deactivated';
        return (
          <li key={e.id} className="flex flex-wrap items-start gap-x-3 gap-y-2 py-4">
            <span
              aria-hidden
              className={cx(
                'grid size-8 shrink-0 place-items-center rounded-lg border',
                attention
                  ? 'border-warning/15 bg-warning-soft/50 text-warning'
                  : 'border-border bg-surface-muted/70 text-text-muted',
              )}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1 basis-60">
              <p className="text-sm font-medium">
                {isLabelled(e.action) ? t(`actions.${e.action}`) : e.action}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-text-muted [overflow-wrap:anywhere]">
                {e.actorName ? t.rich('by', { name: e.actorName, n }) : t('system')}
                {extra ? (
                  <>
                    {' '}
                    · <bdi>{extra}</bdi>
                  </>
                ) : null}
              </p>
            </div>
            {showSchool && e.institutionName ? (
              <Badge>
                <bdi>{e.institutionName}</bdi>
              </Badge>
            ) : null}
            <time dateTime={e.createdAt} className="font-mono text-xs tabular-nums text-text-muted">
              {f.dateTime(new Date(e.createdAt), {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                timeZone,
              })}
            </time>
          </li>
        );
      })}
    </ul>
  );
}
