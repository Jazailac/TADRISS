import {
  attendanceRate,
  countStatuses,
  listMyAttendance,
  type AttendanceStatus,
} from '@tadriss/shared';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Empty, Eyebrow, Pill, Screen, SectionTitle } from '@/ui/kit';

const tone = {
  present: 'success',
  late: 'warning',
  absent: 'danger',
  excused: 'neutral',
} as const satisfies Record<AttendanceStatus, 'success' | 'warning' | 'danger' | 'neutral'>;
const statusFill = {
  present: 'bg-success',
  late: 'bg-warning',
  absent: 'bg-danger',
  excused: 'bg-text-muted',
} as const;
const statuses = ['present', 'late', 'absent', 'excused'] as const;

export default function Attendance() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, reload } = useLoad(() => listMyAttendance(supabase, { limit: 60 }), 'attendance');
  const num = new Intl.NumberFormat(me.locale, { maximumFractionDigits: 1 });
  const date = (iso: string, part: 'day' | 'month') =>
    new Intl.DateTimeFormat(me.locale, {
      ...(part === 'day' ? { day: '2-digit' } : { month: 'short' }),
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`));
  return (
    <Screen
      title={t('attendance.title')}
      subtitle={t('design.attendanceHint')}
      icon="attendance"
      back
      onRefresh={reload}
    >
      <Async state={state} retry={reload}>
        {(entries) => {
          const counts = countStatuses(entries);
          const rate = attendanceRate(counts);
          return entries.length === 0 ? (
            <Empty icon="attendance">{t('attendance.empty')}</Empty>
          ) : (
            <>
              <View className="gap-5 rounded-3xl bg-ink p-6">
                <Eyebrow inverse="ink">{t('attendance.rate')}</Eyebrow>
                <View className="flex-row items-baseline gap-2">
                  <Text className="font-mono text-[64px] leading-[72px] tracking-[-4px] text-ink-foreground">
                    {rate === null ? '–' : num.format(rate)}
                  </Text>
                  {rate === null ? null : (
                    <Text className="font-mono text-xl text-ink-muted">
                      {t('attendance.percent')}
                    </Text>
                  )}
                </View>
                <Text className="text-sm leading-5 text-ink-muted">
                  {t('attendance.window', { count: entries.length })}
                </Text>
                <View
                  accessible={false}
                  className="h-2 flex-row gap-1 overflow-hidden rounded-full"
                >
                  {statuses.map((status) =>
                    counts[status] ? (
                      <View
                        key={status}
                        className={statusFill[status]}
                        style={{ flex: counts[status] }}
                      />
                    ) : null,
                  )}
                </View>
                <View className="flex-row flex-wrap gap-y-4">
                  {statuses.map((status) => (
                    <View key={status} className="w-1/2 gap-1.5">
                      <View className="flex-row items-center gap-2">
                        <View
                          accessible={false}
                          className={`size-1.5 rounded-full ${statusFill[status]}`}
                        />
                        <Text className="text-[13px] text-ink-muted">
                          {t(`attendance.status.${status}`)}
                        </Text>
                      </View>
                      <Text className="font-mono text-lg text-ink-foreground">
                        {num.format(counts[status])}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
              <View className="gap-3">
                <SectionTitle>{t('attendance.register')}</SectionTitle>
                <View className="border-t border-border">
                  {entries.map((entry, index) => (
                    <View
                      key={entry.sessionId}
                      className={`flex-row items-start gap-4 py-5 ${index === entries.length - 1 ? '' : 'border-b border-border'}`}
                    >
                      <View className="w-12 items-center gap-1">
                        <Text className="font-mono text-2xl leading-7 tracking-[-1px] text-text">
                          {date(entry.date, 'day')}
                        </Text>
                        <Text className="text-[13px] text-text-muted">
                          {date(entry.date, 'month')}
                        </Text>
                      </View>
                      <View className="flex-1 gap-2.5 border-s border-border ps-4">
                        <Text className="text-base font-semibold leading-6 tracking-[-0.3px] text-text">
                          {entry.subjectName}
                        </Text>
                        <Pill tone={tone[entry.status]}>
                          {t(`attendance.status.${entry.status}`)}
                        </Pill>
                        {entry.note ? (
                          <Text className="text-sm leading-5 text-text-muted">{entry.note}</Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </>
          );
        }}
      </Async>
    </Screen>
  );
}
