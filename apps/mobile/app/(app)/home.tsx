import {
  attendanceRate,
  countPeople,
  countStatuses,
  formatMoney,
  getDayLessons,
  getFinanceSummary,
  getUnreadCounts,
  homeworkBucket,
  listAnnouncements,
  listHomework,
  listMyAttendance,
  listMyGrades,
  listMyInvoices,
  listSlots,
  ok,
  timeRange,
  weekdayOf,
  weightedAverage20,
  type SlotView,
} from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useLoad } from '@/lib/load';
import { useMe } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { Async, Card, Empty, Muted, Pill, Screen, SectionTitle, Stat } from '@/ui/kit';

/** `6ème A · D4`: class and room, when there is a room. */
const where = (s: SlotView) => (s.room ? `${s.className} · ${s.room}` : s.className);

function Lessons({ slots, taken }: { slots: SlotView[]; taken?: Set<string> }) {
  const { t } = useTranslation();
  if (slots.length === 0) return <Empty>{t('home.noLessons')}</Empty>;
  return (
    <View className="gap-3">
      {slots.map((s) => (
        <View key={s.id} className="flex-row items-center gap-3">
          <Text className="w-28 font-mono text-sm text-text">{timeRange(s)}</Text>
          <View className="flex-1">
            <Text className="font-semibold text-text">{s.subjectName}</Text>
            <Muted>{where(s)}</Muted>
          </View>
          {taken ? (
            <Pill tone={taken.has(s.id) ? 'success' : 'warning'}>
              {taken.has(s.id) ? t('home.rollCallDone') : t('home.rollCallTodo')}
            </Pill>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function News() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, reload } = useLoad(
    () => listAnnouncements(supabase, me.userId, { limit: 3 }),
    'news',
  );
  return (
    <Card>
      <SectionTitle>{t('home.news')}</SectionTitle>
      <Async state={state} retry={reload}>
        {(items) =>
          items.length === 0 ? (
            <Empty>{t('announcements.empty')}</Empty>
          ) : (
            <View className="gap-3">
              {items.map((a) => (
                <Pressable
                  key={a.id}
                  accessibilityRole="link"
                  onPress={() => {
                    router.push(`/more/announcements/${a.id}`);
                  }}
                  className="flex-row items-center gap-2"
                >
                  {a.read ? null : <View className="size-2 rounded-full bg-primary" />}
                  <Text className="flex-1 text-text" numberOfLines={1}>
                    {a.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          )
        }
      </Async>
    </Card>
  );
}

function StudentHome() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, reload } = useLoad(async () => {
    const [slots, hw, att, grades, invoices] = await Promise.all([
      listSlots(supabase),
      listHomework(supabase),
      listMyAttendance(supabase),
      listMyGrades(supabase),
      listMyInvoices(supabase),
    ]);
    const weekday = weekdayOf(me.today);
    const marks = grades.ok ? grades.data : [];
    return ok({
      lessons: (slots.ok ? slots.data : []).filter((s) => s.weekday === weekday),
      todo: (hw.ok ? hw.data : []).filter((h) => homeworkBucket(h, me.today) !== 'done').length,
      rate: att.ok ? attendanceRate(countStatuses(att.data)) : null,
      average: weightedAverage20(
        marks.map((m) => ({
          score: m.score,
          absent: m.absent,
          maxScore: m.maxScore,
          coefficient: m.coefficient,
          subjectId: m.subjectId,
        })),
      ),
      owed: (invoices.ok ? invoices.data : [])
        .filter((i) => !i.voided)
        .reduce((n, i) => n + i.balanceCentimes, 0),
    });
  }, 'student-home');
  return (
    <Async state={state} retry={reload}>
      {(d) => (
        <>
          <View className="flex-row flex-wrap gap-3">
            <Stat
              label={t('home.attendance')}
              value={d.rate === null ? '–' : `${String(d.rate)} %`}
              tone="success"
            />
            <Stat
              label={t('home.average')}
              value={d.average === null ? '–' : `${String(d.average)}/20`}
            />
            <Stat label={t('home.homeworkTodo')} value={String(d.todo)} tone="warning" />
            <Stat
              label={t('home.owed')}
              value={formatMoney(d.owed, me.locale)}
              tone={d.owed > 0 ? 'danger' : 'success'}
            />
          </View>
          <Card>
            <SectionTitle>{t('home.today')}</SectionTitle>
            <Lessons slots={d.lessons} />
          </Card>
        </>
      )}
    </Async>
  );
}

function TeacherHome() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, reload } = useLoad(async () => {
    const [lessons, unread] = await Promise.all([
      getDayLessons(supabase, { date: me.today, teacherId: me.userId }),
      getUnreadCounts(supabase),
    ]);
    if (!lessons.ok) return lessons;
    return ok({ lessons: lessons.data, unread: unread.messages });
  }, 'teacher-home');
  return (
    <Async state={state} retry={reload}>
      {(d) => (
        <>
          <View className="flex-row flex-wrap gap-3">
            <Stat label={t('home.lessonsToday')} value={String(d.lessons.length)} />
            <Stat
              label={t('home.rollCalls')}
              value={`${String(d.lessons.filter((l) => l.taken).length)}/${String(d.lessons.length)}`}
              tone="warning"
            />
            <Stat label={t('home.unreadMessages')} value={String(d.unread)} tone="success" />
          </View>
          <Card>
            <SectionTitle>{t('home.today')}</SectionTitle>
            <Lessons
              slots={d.lessons.map((l) => l.slot)}
              taken={new Set(d.lessons.filter((l) => l.taken).map((l) => l.slot.id))}
            />
          </Card>
        </>
      )}
    </Async>
  );
}

function AdminHome() {
  const { t } = useTranslation();
  const me = useMe();
  const { state, reload } = useLoad(async () => {
    const [students, teachers, finance, lessons] = await Promise.all([
      countPeople(supabase, 'student'),
      countPeople(supabase, 'teacher'),
      getFinanceSummary(supabase, me.today),
      getDayLessons(supabase, { date: me.today }),
    ]);
    return ok({
      students: students.ok ? students.data.active : null,
      teachers: teachers.ok ? teachers.data.active : null,
      outstanding: finance.ok ? finance.data.outstandingCentimes : null,
      rollCalls: lessons.ok
        ? `${String(lessons.data.filter((l) => l.taken).length)}/${String(lessons.data.length)}`
        : null,
    });
  }, 'admin-home');
  return (
    <Async state={state} retry={reload}>
      {(d) => (
        <View className="flex-row flex-wrap gap-3">
          <Stat label={t('home.students')} value={d.students === null ? '–' : String(d.students)} />
          <Stat
            label={t('home.teachers')}
            value={d.teachers === null ? '–' : String(d.teachers)}
            tone="success"
          />
          <Stat label={t('home.rollCalls')} value={d.rollCalls ?? '–'} tone="warning" />
          <Stat
            label={t('home.outstanding')}
            value={d.outstanding === null ? '–' : formatMoney(d.outstanding, me.locale)}
            tone="danger"
          />
        </View>
      )}
    </Async>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const me = useMe();
  const role = me.profile.role;
  return (
    <Screen
      title={t('home.greeting', { name: me.profile.firstName })}
      subtitle={me.profile.institution?.name}
    >
      {role === 'student' ? <StudentHome /> : null}
      {role === 'teacher' ? <TeacherHome /> : null}
      {role === 'institution_admin' ? <AdminHome /> : null}
      {role === 'super_admin' ? <Empty>{t('home.platform')}</Empty> : null}
      {role === 'super_admin' ? null : <News />}
    </Screen>
  );
}
