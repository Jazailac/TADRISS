import { listMyGrades, weightedAverage20 } from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Button, Card, Empty, Muted, Pill, Screen, Stat } from '@/ui/kit';

export default function Grades() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, reload } = useLoad(() => listMyGrades(supabase), 'grades');
  const num = new Intl.NumberFormat(me.locale, { maximumFractionDigits: 2 });
  return (
    <Screen title={t('grades.title')} onRefresh={reload}>
      <Button
        variant="secondary"
        label={t('common.back')}
        onPress={() => {
          router.back();
        }}
      />
      <Async state={state} retry={reload}>
        {(marks) => {
          const average = weightedAverage20(
            marks.map((m) => ({
              score: m.score,
              absent: m.absent,
              maxScore: m.maxScore,
              coefficient: m.coefficient,
              subjectId: m.subjectId,
            })),
          );
          return marks.length === 0 ? (
            <Empty>{t('grades.empty')}</Empty>
          ) : (
            <>
              <View className="flex-row gap-3">
                <Stat
                  label={t('grades.average')}
                  value={average === null ? '–' : `${num.format(average)}/20`}
                />
              </View>
              <View className="gap-3">
                {marks.map((m) => (
                  <Card key={m.examId}>
                    <View className="flex-row items-center justify-between gap-3">
                      <Text className="flex-1 text-base font-semibold text-text">{m.title}</Text>
                      <Text className="font-mono text-base text-text">
                        {m.absent || m.score === null
                          ? t('grades.absent')
                          : `${num.format(m.score)}/${num.format(m.maxScore)}`}
                      </Text>
                    </View>
                    <Muted>{m.subjectName}</Muted>
                    <Pill>{t('grades.term', { term: m.term })}</Pill>
                    {m.remark ? <Text className="text-sm text-text">{m.remark}</Text> : null}
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
