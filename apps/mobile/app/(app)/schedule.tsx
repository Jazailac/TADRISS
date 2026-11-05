import { addDays, listSlots, weekdayOf, type Weekday } from '@tadriss/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSchoolMinute } from '@/lib/clock';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { LessonLedger } from '@/ui/day-ledger';
import { Async, Empty, Screen, SectionTitle } from '@/ui/kit';

const days: Weekday[] = [1, 2, 3, 4, 5, 6];

export default function Schedule() {
  const { t } = useTranslation();
  const me = useMe();
  const isTeacher = me.profile.role === 'teacher';
  const todayDay = weekdayOf(me.today);
  const [day, setDay] = useState<Weekday>(todayDay <= 6 ? (todayDay as Weekday) : 1);
  const now = useSchoolMinute(me.profile.institution?.timezone ?? 'Africa/Casablanca');
  const { state, reload } = useLoad(
    () => listSlots(supabase, isTeacher ? { teacherId: me.userId } : {}),
    'schedule',
  );
  const monday = addDays(me.today, 1 - todayDay);
  const dateFor = (d: Weekday) => new Date(`${addDays(monday, d - 1)}T00:00:00Z`);
  const weekday = (d: Weekday) =>
    new Intl.DateTimeFormat(me.locale, { weekday: 'short', timeZone: 'UTC' }).format(dateFor(d));
  const date = (d: Weekday) =>
    new Intl.DateTimeFormat(me.locale, { day: 'numeric', timeZone: 'UTC' }).format(dateFor(d));
  const shortDate = (d: Weekday) =>
    new Intl.DateTimeFormat(me.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
      dateFor(d),
    );
  const hours = new Intl.NumberFormat(me.locale, { maximumFractionDigits: 1 });
  return (
    <Screen
      title={t('schedule.title')}
      subtitle={t('schedule.week', { start: shortDate(1), end: shortDate(6) })}
      icon="schedule"
      onRefresh={reload}
    >
      <View className="flex-row gap-1 border-b border-border pb-4">
        {days.map((d) => (
          <Pressable
            key={d}
            accessibilityRole="button"
            accessibilityLabel={`${weekday(d)} ${date(d)}`}
            accessibilityState={{ selected: d === day }}
            onPress={() => {
              setDay(d);
            }}
            className={`min-h-20 flex-1 items-center justify-center gap-2 rounded-2xl px-0.5 py-3 ${d === day ? 'bg-primary' : 'bg-transparent'}`}
            style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
          >
            <Text
              className={`text-[13px] font-medium ${d === day ? 'text-primary-foreground/80' : 'text-text-muted'}`}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {weekday(d)}
            </Text>
            <Text
              className={`font-mono text-[23px] tracking-[-0.8px] ${d === day ? 'text-primary-foreground' : 'text-text'}`}
            >
              {date(d)}
            </Text>
            <View
              accessible={false}
              className={`size-1 rounded-full ${d === todayDay ? (d === day ? 'bg-primary-foreground' : 'bg-primary') : 'bg-transparent'}`}
            />
          </Pressable>
        ))}
      </View>
      <Async state={state} retry={reload}>
        {(slots) => {
          const list = slots.filter((s) => s.weekday === day);
          const totalHours = list.reduce((n, s) => n + s.endMin - s.startMin, 0) / 60;
          return list.length === 0 ? (
            <Empty icon="schedule">{t('schedule.none')}</Empty>
          ) : (
            <View className="gap-3">
              <View className="flex-row flex-wrap items-center justify-between gap-3">
                <SectionTitle>{t('design.schoolDay')}</SectionTitle>
                <Text className="font-mono text-sm text-text-muted">
                  {t('schedule.daySummary', {
                    count: list.length,
                    hours: hours.format(totalHours),
                  })}
                </Text>
              </View>
              <LessonLedger slots={list} now={now} today={day === todayDay} teacher={isTeacher} />
            </View>
          );
        }}
      </Async>
    </Screen>
  );
}
