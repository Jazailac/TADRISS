import { listSlots, timeRange, weekdayOf, type Weekday } from '@tadriss/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Card, Empty, Muted, Screen } from '@/ui/kit';

const days: Weekday[] = [1, 2, 3, 4, 5, 6];

export default function Schedule() {
  const { t } = useTranslation();
  const me = useMe();
  const isTeacher = me.profile.role === 'teacher';
  const todayDay = weekdayOf(me.today);
  const [day, setDay] = useState<Weekday>(
    todayDay >= 1 && todayDay <= 6 ? (todayDay as Weekday) : 1,
  );
  const { state, reload } = useLoad(
    () => listSlots(supabase, isTeacher ? { teacherId: me.userId } : {}),
    'schedule',
  );
  // 2026-10-05 is a Monday: a fixed reference to get weekday names in the app's language.
  const name = (d: Weekday) =>
    new Intl.DateTimeFormat(me.locale, { weekday: 'short', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2026, 9, 4 + d)),
    );

  return (
    <Screen title={t('schedule.title')} onRefresh={reload}>
      <View className="flex-row gap-2">
        {days.map((d) => (
          <Pressable
            key={d}
            accessibilityRole="button"
            accessibilityState={{ selected: d === day }}
            onPress={() => {
              setDay(d);
            }}
            className={`flex-1 items-center rounded-md py-2 ${
              d === day ? 'bg-primary' : 'bg-surface-muted'
            }`}
          >
            <Text
              className={`text-sm font-semibold ${d === day ? 'text-primary-foreground' : 'text-text'}`}
            >
              {name(d)}
            </Text>
          </Pressable>
        ))}
      </View>
      <Async state={state} retry={reload}>
        {(slots) => {
          const list = slots.filter((s) => s.weekday === day);
          return list.length === 0 ? (
            <Empty>{t('schedule.none')}</Empty>
          ) : (
            <View className="gap-3">
              {list.map((s) => (
                <Card key={s.id}>
                  <Text className="font-mono text-sm text-text-muted">{timeRange(s)}</Text>
                  <Text className="text-lg font-semibold text-text">{s.subjectName}</Text>
                  <Muted>
                    {[s.className, isTeacher ? null : s.teacherName, s.room]
                      .filter(Boolean)
                      .join(' · ')}
                  </Muted>
                </Card>
              ))}
            </View>
          );
        }}
      </Async>
    </Screen>
  );
}
