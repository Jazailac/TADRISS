import {
  attendanceRate,
  countStatuses,
  listMyAttendance,
  type AttendanceStatus,
} from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Button, Card, Empty, Muted, Pill, Screen, Stat } from '@/ui/kit';

const tone = {
  present: 'success',
  late: 'warning',
  absent: 'danger',
  excused: 'neutral',
} as const satisfies Record<AttendanceStatus, 'success' | 'warning' | 'danger' | 'neutral'>;

export default function Attendance() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, reload } = useLoad(() => listMyAttendance(supabase, { limit: 60 }), 'attendance');
  const date = (iso: string) =>
    new Intl.DateTimeFormat(me.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
      new Date(`${iso}T00:00:00Z`),
    );
  return (
    <Screen title={t('attendance.title')} onRefresh={reload}>
      <Button
        variant="secondary"
        label={t('common.back')}
        onPress={() => {
          router.back();
        }}
      />
      <Async state={state} retry={reload}>
        {(entries) => {
          const rate = attendanceRate(countStatuses(entries));
          return entries.length === 0 ? (
            <Empty>{t('attendance.empty')}</Empty>
          ) : (
            <>
              <View className="flex-row gap-3">
                <Stat
                  label={t('attendance.rate')}
                  value={rate === null ? '–' : `${String(rate)} %`}
                  tone="success"
                />
              </View>
              <View className="gap-3">
                {entries.map((e) => (
                  <Card key={e.sessionId}>
                    <View className="flex-row items-center justify-between gap-3">
                      <Text className="flex-1 text-base font-semibold text-text">
                        {e.subjectName}
                      </Text>
                      <Pill tone={tone[e.status]}>{t(`attendance.status.${e.status}`)}</Pill>
                    </View>
                    <Muted>{date(e.date)}</Muted>
                    {e.note ? <Text className="text-sm text-text">{e.note}</Text> : null}
                  </Card>
                ))}
              </View>
            </>
          );
        }}
      </Async>
    </Screen>
  );
}
