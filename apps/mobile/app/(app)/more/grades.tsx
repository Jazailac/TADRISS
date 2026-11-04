import { listMyGrades, weightedAverage20 } from '@tadriss/shared';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Empty, Eyebrow, Progress, Screen, SectionTitle, SubjectLabel } from '@/ui/kit';

const terms = ['all', 1, 2] as const;

export default function Grades() {
  const { t } = useTranslation();
  const me = useMe();
  const [term, setTerm] = useState<(typeof terms)[number]>('all');
  const { state, reload } = useLoad(() => listMyGrades(supabase), 'grades');
  const num = new Intl.NumberFormat(me.locale, { maximumFractionDigits: 2 });
  const date = (iso: string) =>
    new Intl.DateTimeFormat(me.locale, { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
      new Date(`${iso}T00:00:00Z`),
    );
  return (
    <Screen
      title={t('grades.title')}
      subtitle={t('design.gradesHint')}
      icon="grades"
      back
      onRefresh={reload}
    >
      <View className="flex-row gap-1 rounded-xl bg-surface-muted p-1">
        {terms.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{ selected: value === term }}
            onPress={() => {
              setTerm(value);
            }}
            className={`min-h-11 flex-1 items-center justify-center rounded-lg px-2 ${value === term ? 'bg-surface' : ''}`}
          >
            <Text
              className={`text-sm font-semibold ${value === term ? 'text-primary' : 'text-text-muted'}`}
            >
              {t(value === 'all' ? 'grades.allTerms' : 'grades.term', { term: value })}
            </Text>
          </Pressable>
        ))}
      </View>
      <Async state={state} retry={reload}>
        {(allMarks) => {
          const marks = allMarks.filter((m) => term === 'all' || m.term === term);
          const asInput = (list: typeof marks) =>
            list.map((m) => ({
              score: m.score,
              absent: m.absent,
              maxScore: m.maxScore,
              coefficient: m.coefficient,
              subjectId: m.subjectId,
            }));
          const average = weightedAverage20(asInput(marks));
          const subjects = Array.from(new Set(marks.map((m) => m.subjectId)))
            .map((id) => {
              const list = marks.filter((m) => m.subjectId === id);
              const first = list[0];
              return first
                ? {
                    id,
                    name: first.subjectName,
                    color: first.subjectColor,
                    average: weightedAverage20(asInput(list)),
                  }
                : null;
            })
            .filter((s) => s !== null);
          return !marks.length ? (
            <Empty icon="grades">{t('grades.empty')}</Empty>
          ) : (
            <>
              <View className="gap-5 rounded-3xl bg-primary p-6">
                <Eyebrow inverse>{t('grades.average')}</Eyebrow>
                <View className="flex-row items-baseline gap-2">
                  <Text
                    className="font-mono text-[64px] leading-[70px] tracking-[-4px] text-primary-foreground"
                    adjustsFontSizeToFit
                    numberOfLines={1}
                  >
                    {average === null ? '–' : num.format(average)}
                  </Text>
                  <Text className="font-mono text-xl text-primary-foreground/70">
                    {t('grades.outOf20')}
                  </Text>
                </View>
                <Text className="border-t border-primary-foreground/20 pt-4 text-sm text-primary-foreground/80">
                  {t('grades.resultsCount', { count: marks.length })}
                </Text>
              </View>
              <View className="gap-5">
                <SectionTitle>{t('grades.bySubject')}</SectionTitle>
                {subjects.map((subject) => (
                  <View key={subject.id} className="gap-2.5">
                    <View className="flex-row items-center gap-3">
                      <View className="flex-1">
                        <SubjectLabel name={subject.name} color={subject.color} />
                      </View>
                      <Text className="font-mono text-sm text-text">
                        {subject.average === null ? '–' : `${num.format(subject.average)}/20`}
                      </Text>
                    </View>
                    <Progress
                      value={subject.average === null ? 0 : subject.average * 5}
                      label={subject.name}
                    />
                  </View>
                ))}
              </View>
              <View className="gap-2">
                <SectionTitle>{t('grades.results')}</SectionTitle>
                <View className="border-t border-border">
                  {marks.map((m, index) => (
                    <View
                      key={m.examId}
                      className={`gap-3 py-5 ${index === marks.length - 1 ? '' : 'border-b border-border'}`}
                    >
                      <View className="flex-row items-start justify-between gap-4">
                        <View className="flex-1 gap-2">
                          <SubjectLabel name={m.subjectName} color={m.subjectColor} />
                          <Text className="text-base font-semibold leading-6 tracking-[-0.3px] text-text">
                            {m.title}
                          </Text>
                        </View>
                        <View className="items-end gap-1">
                          <Text
                            className={`font-mono text-2xl tracking-[-1px] ${m.absent ? 'text-text-muted' : 'text-primary'}`}
                          >
                            {m.absent
                              ? t('grades.absent')
                              : m.score === null
                                ? '–'
                                : num.format(m.score)}
                          </Text>
                          {m.absent || m.score === null ? null : (
                            <Text className="font-mono text-sm text-text-muted">
                              {t('grades.outOf', { max: num.format(m.maxScore) })}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Text className="text-[13px] leading-5 text-text-muted">
                        {[
                          date(m.examDate),
                          t('grades.term', { term: m.term }),
                          t('grades.coefficient', { value: num.format(m.coefficient) }),
                        ].join(' · ')}
                      </Text>
                      {m.remark ? (
                        <Text className="border-s-2 border-border-strong ps-3 text-base leading-6 text-text-muted">
                          {m.remark}
                        </Text>
                      ) : null}
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
