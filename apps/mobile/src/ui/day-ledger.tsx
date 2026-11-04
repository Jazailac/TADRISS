import { minutesToTime, timeRange, type SlotView } from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { Eyebrow, Icon, Pill, Progress, SubjectLabel } from './kit';

export function DayFocus({ slots, now }: { slots: SlotView[]; now: number }) {
  const { t } = useTranslation();
  const ordered = [...slots].sort((a, b) => a.startMin - b.startMin);
  const focus = ordered.find((slot) => slot.endMin > now);
  const current = focus && focus.startMin <= now;
  const position = focus
    ? `${String(ordered.indexOf(focus) + 1).padStart(2, '0')} / ${String(ordered.length).padStart(2, '0')}`
    : String(ordered.length);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        router.push('/schedule');
      }}
      className="gap-5 overflow-hidden rounded-3xl bg-primary p-6"
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-row items-center gap-2">
          <View accessible={false} className="size-1.5 rounded-full bg-primary-foreground" />
          <Eyebrow inverse>
            {t(current ? 'home.inProgress' : focus ? 'home.upNext' : 'home.today')}
          </Eyebrow>
        </View>
        <Text className="font-mono text-[13px] text-primary-foreground/80">{position}</Text>
      </View>
      {focus ? (
        <View className="gap-4">
          <Text className="text-[29px] font-semibold leading-[35px] tracking-[-0.9px] text-primary-foreground">
            {focus.subjectName}
          </Text>
          <Text className="font-mono text-[30px] leading-10 tracking-[-1.5px] text-primary-foreground">
            {timeRange(focus)}
          </Text>
          <View className="flex-row items-center justify-between gap-3 border-t border-primary-foreground/20 pt-4">
            <Text className="flex-1 text-sm leading-5 text-primary-foreground/85">
              {[focus.className, focus.room].filter(Boolean).join(' · ')}
            </Text>
            <Icon name="arrow" tone="inverse" />
          </View>
          {current ? (
            <Progress
              inverse
              value={((now - focus.startMin) / (focus.endMin - focus.startMin)) * 100}
              label={t('home.inProgress')}
            />
          ) : null}
        </View>
      ) : (
        <View className="gap-3">
          <Text className="text-[26px] font-semibold leading-8 tracking-[-0.7px] text-primary-foreground">
            {t(slots.length ? 'home.dayComplete' : 'home.noLessons')}
          </Text>
          <View className="flex-row items-center justify-between gap-3">
            <Text className="text-sm text-primary-foreground/80">{t('schedule.title')}</Text>
            <Icon name="arrow" tone="inverse" />
          </View>
        </View>
      )}
    </Pressable>
  );
}

export function LessonLedger({
  slots,
  now,
  today = false,
  teacher = false,
  taken,
}: {
  slots: SlotView[];
  now: number;
  today?: boolean;
  teacher?: boolean;
  taken?: Set<string>;
}) {
  const { t } = useTranslation();
  const ordered = [...slots].sort((a, b) => a.startMin - b.startMin);
  return (
    <View className="border-t border-border">
      {ordered.map((slot, index) => {
        const current = today && slot.startMin <= now && slot.endMin > now;
        const elapsed = today && slot.endMin <= now;
        return (
          <View
            key={slot.id}
            className={`flex-row gap-4 py-5 ${index === ordered.length - 1 ? '' : 'border-b border-border'} ${current ? 'bg-primary-soft/50' : ''}`}
          >
            <View className="w-16 gap-1.5">
              <Text
                className={`font-mono text-[15px] tracking-[-0.7px] ${current ? 'text-primary' : elapsed ? 'text-text-muted' : 'text-text'}`}
              >
                {minutesToTime(slot.startMin)}
              </Text>
              <Text className="font-mono text-[13px] text-text-muted">
                {minutesToTime(slot.endMin)}
              </Text>
            </View>
            <View className="flex-1 gap-2 border-s border-border ps-4">
              <SubjectLabel name={slot.subjectName} color={slot.subjectColor} />
              <Text
                className={`text-lg font-semibold leading-6 tracking-[-0.4px] ${elapsed ? 'text-text-muted' : 'text-text'}`}
              >
                {slot.className}
              </Text>
              <Text className="text-sm leading-5 text-text-muted">
                {[
                  teacher ? null : slot.teacherName,
                  slot.room,
                  t('schedule.duration', { minutes: slot.endMin - slot.startMin }),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {current ? <Pill tone="primary">{t('home.inProgress')}</Pill> : null}
              {taken ? (
                <Pill tone={taken.has(slot.id) ? 'success' : 'warning'}>
                  {t(taken.has(slot.id) ? 'home.rollCallDone' : 'home.rollCallTodo')}
                </Pill>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
