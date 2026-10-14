import { homeworkBucket, listHomework, setHomeworkDone, type HomeworkView } from '@tadriss/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Card, Empty, ErrorBox, Muted, Pill, Screen, SectionTitle } from '@/ui/kit';

const subjectAndClass = (h: HomeworkView) => `${h.subjectName} · ${h.className}`;

export default function Homework() {
  const { t } = useTranslation();
  const me = useMe();
  const isStudent = me.profile.role === 'student';
  const { state, reload } = useLoad(
    () => listHomework(supabase, isStudent ? {} : { teacherId: me.userId }),
    'homework',
  );
  const [error, setError] = useState<string | null>(null);

  const toggle = async (h: HomeworkView) => {
    const done = h.doneCount === 0;
    const res = await setHomeworkDone(supabase, {
      institutionId: me.institutionId,
      studentId: me.userId,
      homeworkId: h.id,
      done,
    });
    setError(res.ok ? null : res.error);
    await reload();
  };

  const due = (h: HomeworkView) =>
    new Intl.DateTimeFormat(me.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
      new Date(`${h.dueDate}T00:00:00Z`),
    );

  return (
    <Screen
      title={t('homework.title')}
      subtitle={t(isStudent ? 'homework.studentSubtitle' : 'homework.teacherSubtitle')}
      onRefresh={reload}
    >
      {error ? <ErrorBox code="unknown" /> : null}
      <Async state={state} retry={reload}>
        {(items) => {
          if (items.length === 0) return <Empty>{t('homework.none')}</Empty>;
          const buckets = {
            overdue: items.filter((h) => homeworkBucket(h, me.today) === 'overdue'),
            upcoming: items.filter((h) => homeworkBucket(h, me.today) === 'upcoming'),
            done: items.filter((h) => homeworkBucket(h, me.today) === 'done'),
          };
          const sections = isStudent
            ? (['overdue', 'upcoming', 'done'] as const)
            : (['upcoming'] as const);
          const teacherList = items.filter((h) => h.dueDate >= me.today);
          return (
            <>
              {sections.map((key) => {
                const list = isStudent ? buckets[key] : teacherList;
                if (list.length === 0) return null;
                return (
                  <View key={key} className="gap-3">
                    <SectionTitle>{t(`homework.${key}`)}</SectionTitle>
                    {list.map((h) => (
                      <Card key={h.id}>
                        <View className="flex-row items-start gap-3">
                          {isStudent ? (
                            <Pressable
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: h.doneCount > 0 }}
                              accessibilityLabel={t('homework.mark', { title: h.title })}
                              onPress={() => {
                                void toggle(h);
                              }}
                              className={`mt-0.5 size-7 items-center justify-center rounded-md border ${
                                h.doneCount > 0
                                  ? 'border-success bg-success'
                                  : 'border-border-strong'
                              }`}
                            >
                              {h.doneCount > 0 ? (
                                <Text className="font-bold text-primary-foreground">
                                  {t('homework.check')}
                                </Text>
                              ) : null}
                            </Pressable>
                          ) : null}
                          <View className="flex-1 gap-1">
                            <Text className="text-base font-semibold text-text">{h.title}</Text>
                            <Muted>{subjectAndClass(h)}</Muted>
                            {h.description ? (
                              <Text className="text-sm text-text" numberOfLines={3}>
                                {h.description}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                        <View className="flex-row flex-wrap gap-2">
                          <Pill tone={key === 'overdue' ? 'danger' : 'neutral'}>
                            {t('homework.due', { date: due(h) })}
                          </Pill>
                          {isStudent ? null : (
                            <Pill tone="primary">
                              {t('homework.finished', { count: h.doneCount })}
                            </Pill>
                          )}
                        </View>
                      </Card>
                    ))}
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
