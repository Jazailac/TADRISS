import { formatMoney, invoiceStatus, listMyInvoices } from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Button, Card, Empty, Muted, Pill, Screen, Stat } from '@/ui/kit';

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
  return (
    <Screen title={t('payments.title')} onRefresh={reload}>
      <Button
        variant="secondary"
        label={t('common.back')}
        onPress={() => {
          router.back();
        }}
      />
      <Async state={state} retry={reload}>
        {(invoices) => {
          const live = invoices.filter((i) => !i.voided);
          const owed = live.reduce((n, i) => n + i.balanceCentimes, 0);
          return invoices.length === 0 ? (
            <Empty>{t('payments.empty')}</Empty>
          ) : (
            <>
              <View className="flex-row gap-3">
                <Stat
                  label={t('payments.owed')}
                  value={formatMoney(owed, me.locale)}
                  tone={owed > 0 ? 'danger' : 'success'}
                />
              </View>
              <View className="gap-3">
                {invoices.map((i) => {
                  const status = invoiceStatus(i, me.today);
                  return (
                    <Card key={i.id}>
                      <View className="flex-row items-center justify-between gap-3">
                        <Text className="flex-1 text-base font-semibold text-text">
                          {i.description}
                        </Text>
                        <Pill tone={tone[status]}>{t(`payments.status.${status}`)}</Pill>
                      </View>
                      <Muted>{i.number}</Muted>
                      <Text className="font-mono text-sm text-text">
                        {t('payments.of', {
                          paid: formatMoney(i.paidCentimes, me.locale),
                          total: formatMoney(i.amountCentimes, me.locale),
                        })}
                      </Text>
                    </Card>
                  );
                })}
              </View>
            </>
          );
        }}
      </Async>
    </Screen>
  );
}
