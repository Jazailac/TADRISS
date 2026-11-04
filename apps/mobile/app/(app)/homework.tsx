import {
  homeworkBucket,
  listHomework,
  setHomeworkDone,
  type ErrorCode,
  type HomeworkView,
} from '@tadriss/shared';
import { dark, light, rgb } from '@tadriss/ui-tokens';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import {
  Async,
  Empty,
  ErrorBox,
  Eyebrow,
  Icon,
  Progress,
  Screen,
  SectionTitle,
  SubjectLabel,
} from '@/ui/kit';

export default function Homework() {
  const { t } = useTranslation();
  const me = useMe();
  const isStudent = me.profile.role === 'student';
  const { colorScheme } = useColorScheme();
  const palette = colorScheme === 'dark' ? dark : light;
  const { state, reload } = useLoad(
    () => listHomework(supabase, isStudent ? {} : { teacherId: me.userId }),
    'homework',
  );
  const [error, setError] = useState<ErrorCode | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const toggle = async (h: HomeworkView) => {
    if (pending) return;
    setPending(h.id);
    const res = await setHomeworkDone(supabase, {
      institutionId: me.institutionId,
      studentId: me.userId,
      homeworkId: h.id,
      done: h.doneCount === 0,
    });
    setError(res.ok ? null : res.error);
    await reload();
    setPending(null);
  };
  const due = (h: HomeworkView) =>
    new Intl.DateTimeFormat(me.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
      new Date(`${h.dueDate}T00:00:00Z`),
    );
  return (
    <Screen
      title={t('homework.title')}
      icon="homework"
      subtitle={t(isStudent ? 'homework.studentSubtitle' : 'homework.teacherSubtitle')}
      onRefresh={reload}
    >
      {error ? <ErrorBox code={error} /> : null}
      <Async state={state} retry={reload}>
        {(items) => {
          const buckets = {
            overdue: items.filter((h) => homeworkBucket(h, me.today) === 'overdue'),
            upcoming: items.filter((h) => homeworkBucket(h, me.today) === 'upcoming'),
            done: items.filter((h) => homeworkBucket(h, me.today) === 'done'),
          };
          const teacherList = items.filter((h) => h.dueDate >= me.today);
          if (!items.length || (!isStudent && !teacherList.length))
            return <Empty icon="homework">{t('homework.none')}</Empty>;
          const todo = buckets.overdue.length + buckets.upcoming.length;
          const progress = items.length ? (buckets.done.length / items.length) * 100 : 0;
          const sections = isStudent
            ? (['overdue', 'upcoming', 'done'] as const)
            : (['upcoming'] as const);
          return (
            <>
              <View className="gap-5 rounded-3xl bg-ink p-6">
                <Text className="text-[13px] font-semibold uppercase tracking-[1.5px] text-ink-muted">
                  {t('homework.workPlan')}
                </Text>
                <View className="flex-row items-end gap-4">
                  <Text className="font-mono text-[60px] leading-[65px] tracking-[-3px] text-ink-foreground">
                    {String(isStudent ? todo : teacherList.length)}
                  </Text>
                  <Text className="mb-2 flex-1 text-sm leading-5 text-ink-muted">
                    {t('home.homeworkTodo')}
                  </Text>
                </View>
                {isStudent ? (
                  <View className="gap-3">
                    <Text className="text-sm text-ink-muted">
                      {t('homework.progress', { done: buckets.done.length, total: items.length })}
                    </Text>
                    <Progress value={progress} label={t('homework.done')} tone="success" />
                  </View>
                ) : (
                  <Text className="border-t border-ink-foreground/15 pt-4 text-sm text-ink-muted">
                    {t('homework.finished', {
                      count: teacherList.reduce((n, h) => n + h.doneCount, 0),
                    })}
                  </Text>
                )}
              </View>
              {sections.map((key) => {
                const list = (isStudent ? buckets[key] : teacherList)
                  .slice()
                  .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
                if (!list.length) return null;
                return (
                  <View key={key} className="gap-1">
                    {key === 'done' ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ expanded: showDone }}
                        onPress={() => {
                          setShowDone(!showDone);
                        }}
                        className="min-h-12 flex-row items-center justify-between gap-3"
                      >
                        <SectionTitle>{t('homework.done')}</SectionTitle>
                        <View className="flex-row items-center gap-3">
                          <Text className="font-mono text-sm text-text-muted">
                            {String(list.length)}
                          </Text>
                          <Icon name={showDone ? 'back' : 'arrow'} />
                        </View>
                      </Pressable>
                    ) : (
                      <View className="min-h-12 flex-row items-center justify-between gap-3">
                        <SectionTitle>{t(`homework.${key}`)}</SectionTitle>
                        <Text
                          className={`font-mono text-sm ${key === 'overdue' ? 'text-danger' : 'text-text-muted'}`}
                        >
                          {String(list.length)}
                        </Text>
                      </View>
                    )}
                    {key === 'done' && !showDone ? null : (
                      <View className="border-t border-border">
                        {list.map((h, index) => (
                          <View
                            key={h.id}
                            className={`flex-row items-start gap-3 py-5 ${index === list.length - 1 ? '' : 'border-b border-border'}`}
                          >
                            {isStudent ? (
                              <Pressable
                                accessibilityRole="checkbox"
                                accessibilityState={{
                                  checked: h.doneCount > 0,
                                  busy: pending === h.id,
                                  disabled: pending !== null,
                                }}
                                disabled={pending !== null}
                                accessibilityLabel={t('homework.mark', { title: h.title })}
                                onPress={() => {
                                  void toggle(h);
                                }}
                                className={`size-11 items-center justify-center rounded-full border ${h.doneCount > 0 ? 'border-success bg-success-soft' : key === 'overdue' ? 'border-danger/40 bg-danger-soft' : 'border-border-strong bg-surface'}`}
                                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                              >
                                {pending === h.id ? (
                                  <ActivityIndicator size="small" color={rgb(palette, 'primary')} />
                                ) : h.doneCount > 0 ? (
                                  <Icon name="check" tone="success" />
                                ) : (
                                  <View
                                    accessible={false}
                                    className={`size-2 rounded-full ${key === 'overdue' ? 'bg-danger' : 'bg-border-strong'}`}
                                  />
                                )}
                              </Pressable>
                            ) : null}
                            <View className="flex-1 gap-2.5">
                              <SubjectLabel name={h.subjectName} color={h.subjectColor} />
                              <Text
                                className={`text-[17px] font-semibold leading-6 tracking-[-0.3px] ${key === 'done' ? 'text-text-muted line-through' : 'text-text'}`}
                              >
                                {h.title}
                              </Text>
                              <View className="flex-row flex-wrap items-center gap-2">
                                <Text
                                  className={`text-[13px] font-medium ${key === 'overdue' ? 'text-danger' : 'text-text-muted'}`}
                                >
                                  {t('homework.due', { date: due(h) })}
                                </Text>
                                <Text className="text-[13px] text-text-muted">{h.className}</Text>
                              </View>
                              {h.description ? (
                                <Pressable
                                  accessibilityRole="button"
                                  accessibilityState={{ expanded: expanded === h.id }}
                                  accessibilityLabel={t('homework.details', { title: h.title })}
                                  onPress={() => {
                                    setExpanded(expanded === h.id ? null : h.id);
                                  }}
                                  className="gap-2 py-1"
                                >
                                  <Text
                                    className="text-base leading-6 text-text-muted"
                                    numberOfLines={expanded === h.id ? undefined : 2}
                                  >
                                    {h.description}
                                  </Text>
                                  <Text className="text-[13px] font-semibold text-primary">
                                    {t(expanded === h.id ? 'common.showLess' : 'common.readMore')}
                                  </Text>
                                </Pressable>
                              ) : null}
                              {isStudent ? null : (
                                <Eyebrow>{t('homework.finished', { count: h.doneCount })}</Eyebrow>
                              )}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          );
        }}
      </Async>
    </Screen>
  );
}
