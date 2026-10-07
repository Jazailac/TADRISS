'use client';

import { centimesToInput, formatMoney, paymentMethods } from '@tadriss/shared';
import { Ban, HandCoins } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { recordPaymentAction, voidInvoiceAction, voidPaymentAction } from '@/app/actions/finance';
import { useRouter } from '@/i18n/navigation';
import { ActionForm } from '../forms/action-form';
import { Button } from '../ui/button';
import { Dialog } from '../ui/dialog';
import { useToast } from '../ui/toast';

/** Record a payment against one invoice. The amount defaults to what is left to pay. */
export function RecordPaymentButton({
  invoiceId,
  balanceCentimes,
  today,
}: {
  invoiceId: string;
  balanceCentimes: number;
  today: string;
}) {
  const t = useTranslations('finance.payment');
  const f = useTranslations('finance');
  const c = useTranslations('common');
  const locale = useLocale();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        icon={<HandCoins className="size-4" aria-hidden />}
        disabled={balanceCentimes <= 0}
        onClick={() => {
          setOpen(true);
        }}
      >
        {f('actions.pay')}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t('title')}
        description={t('remaining', { amount: formatMoney(balanceCentimes, locale) })}
      >
        <ActionForm
          schema="recordPayment"
          action={recordPaymentAction}
          hidden={{ invoiceId }}
          defaults={{ amount: centimesToInput(balanceCentimes), method: 'cash', paidOn: today }}
          fields={[
            { name: 'amount', label: t('fields.amount'), kind: 'decimal', half: true },
            {
              name: 'method',
              label: t('fields.method'),
              kind: 'select',
              options: paymentMethods.map((m) => ({ value: m, label: t(`methods.${m}`) })),
              half: true,
            },
            { name: 'paidOn', label: t('fields.paidOn'), kind: 'date', half: true },
            {
              name: 'reference',
              label: t('fields.reference'),
              kind: 'text',
              placeholder: t('placeholders.reference'),
              half: true,
            },
          ]}
          submitLabel={t('submit')}
          cancelLabel={c('cancel')}
          onCancel={close}
          onDone={(values) => {
            close();
            toast.success(f('feedback.paymentRecorded', { receipt: values.receipt ?? '' }));
            router.refresh();
          }}
        />
      </Dialog>
    </>
  );
}

/** Void a payment or an invoice. A reason is mandatory and the void is final. */
export function VoidButton({
  kind,
  id,
  receipt,
  compact,
}: {
  kind: 'payment' | 'invoice';
  id: string;
  /** The receipt number, shown in the confirmation (payments only). */
  receipt?: string;
  compact?: boolean;
}) {
  const t = useTranslations('finance.void');
  const f = useTranslations('finance');
  const c = useTranslations('common');
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const close = () => {
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        icon={<Ban className="size-4" aria-hidden />}
        onClick={() => {
          setOpen(true);
        }}
      >
        {compact ? f('actions.voidPayment') : f('actions.voidInvoice')}
      </Button>
      <Dialog
        open={open}
        onClose={close}
        title={t(kind === 'payment' ? 'paymentTitle' : 'invoiceTitle')}
        description={
          kind === 'payment' ? t('paymentBody', { receipt: receipt ?? '' }) : t('invoiceBody')
        }
      >
        <ActionForm
          schema="voidDocument"
          action={async (prev, fd) => {
            const result = await (kind === 'payment' ? voidPaymentAction : voidInvoiceAction)(
              prev,
              fd,
            );
            // Toast from here, not from onDone: revalidation removes this very button (a voided
            // payment has no void control), so the form can unmount before its effect runs.
            if (result?.done)
              toast.success(
                f(kind === 'payment' ? 'feedback.paymentVoided' : 'feedback.invoiceVoided'),
              );
            return result;
          }}
          hidden={{ id }}
          fields={[
            {
              name: 'reason',
              label: t('reason'),
              kind: 'textarea',
              placeholder: t('reasonPlaceholder'),
            },
          ]}
          submitLabel={t('confirm')}
          cancelLabel={c('cancel')}
          onCancel={close}
          onDone={() => {
            close();
            router.refresh();
          }}
        />
      </Dialog>
    </>
  );
}
