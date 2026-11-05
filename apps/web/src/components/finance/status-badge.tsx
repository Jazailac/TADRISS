import type { InvoiceStatus } from '@tadriss/shared';
import { useTranslations } from 'next-intl';
import { Badge, type Tone } from '../ui/badge';

const tones: Record<InvoiceStatus, Tone> = {
  paid: 'success',
  partial: 'info',
  unpaid: 'neutral',
  overdue: 'danger',
  void: 'warning',
};

/** Colour plus a word, never colour alone. */
export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const t = useTranslations('finance.status');
  return (
    <Badge tone={tones[status]} dot>
      {t(status)}
    </Badge>
  );
}
