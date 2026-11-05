import { formatMoney, invoiceStatus, listMyInvoices } from '@tadriss/shared';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Empty, Eyebrow, Pill, Progress, Screen, SectionTitle } from '@/ui/kit';

const tone = {
  paid: 'success',
  partial: 'warning',
  unpaid: 'neutral',
  overdue: 'danger',
  void: 'neutral',
} as const;

export default function Payments() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, reload } = useLoad(() => listMyInvoices(supabase), 'payments');
  const date = (iso: string) =>
    new Intl.DateTimeFormat(me.locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
  return (
    <Screen
      title={t('payments.title')}
      subtitle={t('design.paymentsHint')}
      icon="payments"
      back
      onRefresh={reload}
    >
      <Async state={state} retry={reload}>
        {(invoices) => {
          const live = invoices.filter((invoice) => !invoice.voided);
          const owed = live.reduce((sum, invoice) => sum + invoice.balanceCentimes, 0);
          const paid = live.reduce((sum, invoice) => sum + invoice.paidCentimes, 0);
          const total = live.reduce((sum, invoice) => sum + invoice.amountCentimes, 0);
          return invoices.length === 0 ? (
            <Empty icon="payments">{t('payments.empty')}</Empty>
          ) : (
            <>
              <View className="gap-5 rounded-3xl bg-ink p-6">
                <Eyebrow inverse="ink">{t('payments.owed')}</Eyebrow>
                <Text
                  className="font-mono text-[36px] leading-[46px] tracking-[-1.8px] text-ink-foreground"
                  adjustsFontSizeToFit
                  numberOfLines={1}
                >
                  {formatMoney(owed, me.locale)}
                </Text>
                <View className="gap-3 border-t border-ink-foreground/15 pt-4">
                  <View className="flex-row flex-wrap items-center justify-between gap-2">
                    <Text className="text-sm text-ink-muted">{t('payments.paid')}</Text>
                    <Text className="font-mono text-sm text-ink-foreground">
                      {formatMoney(paid, me.locale)}
                    </Text>
                  </View>
                  {total > 0 ? (
                    <Progress
                      inverse="ink"
                      value={(paid / total) * 100}
                      label={t('payments.paid')}
                    />
                  ) : null}
                </View>
              </View>
              <View className="gap-3">
                <SectionTitle>{t('payments.ledger')}</SectionTitle>
                <View className="border-t border-border">
                  {invoices.map((invoice, index) => {
                    const status = invoiceStatus(invoice, me.today);
                    return (
                      <View
                        key={invoice.id}
                        className={`gap-4 py-5 ${index === invoices.length - 1 ? '' : 'border-b border-border'}`}
                      >
                        <View className="flex-row flex-wrap items-center justify-between gap-2">
                          <Text className="font-mono text-[13px] text-text-muted">
                            {invoice.number}
                          </Text>
                          <Pill tone={tone[status]}>{t(`payments.status.${status}`)}</Pill>
                        </View>
                        <Text className="text-lg font-semibold leading-7 tracking-[-0.4px] text-text">
                          {invoice.description}
                        </Text>
                        <View className="gap-2 border-s-2 border-border-strong ps-4">
                          <Text
                            className={`font-mono text-2xl tracking-[-0.8px] ${invoice.voided ? 'text-text-muted line-through' : invoice.balanceCentimes > 0 ? 'text-accent' : 'text-success'}`}
                          >
                            {formatMoney(invoice.balanceCentimes, me.locale)}
                          </Text>
                          <Text className="text-[13px] text-text-muted">{t('payments.owed')}</Text>
                        </View>
                        <Text className="text-sm leading-5 text-text-muted">
                          {t('payments.of', {
                            paid: formatMoney(invoice.paidCentimes, me.locale),
                            total: formatMoney(invoice.amountCentimes, me.locale),
                          })}
                        </Text>
                        <Text className="text-sm text-text-muted">
                          {t('payments.due', { date: date(invoice.dueDate) })}
                        </Text>
                        {invoice.voided ? null : (
                          <Progress
                            value={
                              invoice.amountCentimes > 0
                                ? (invoice.paidCentimes / invoice.amountCentimes) * 100
                                : 0
                            }
                            label={invoice.description}
                            tone={
                              status === 'paid'
                                ? 'success'
                                : status === 'overdue'
                                  ? 'danger'
                                  : 'primary'
                            }
                          />
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          );
        }}
      </Async>
    </Screen>
  );
}
