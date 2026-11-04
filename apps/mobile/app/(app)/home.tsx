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
  weekdayOf,
  weightedAverage20,
  type AnnouncementView,
  type HomeworkView,
  type Result,
  type SlotView,
} from '@tadriss/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text, View } from 'react-native';
import { useSchoolMinute } from '@/lib/clock';
import { useLoad, type Loaded } from '@/lib/load';
import { useMe, type Me } from '@/lib/me';
import { supabase } from '@/lib/supabase';
import { DayFocus, LessonLedger } from '@/ui/day-ledger';
import {
  Async,
  Avatar,
  BrandMark,
  Empty,
  Icon,
  MetricRail,
  ModuleIcon,
  Pill,
  Screen,
  SectionTitle,
  SubjectLabel,
  type IconName,
} from '@/ui/kit';

type HomeData =
  | {
      kind: 'student';
      lessons: SlotView[];
      pending: HomeworkView[];
      rate: number | null;
      average: number | null;
      owed: number;
    }
  | { kind: 'teacher'; lessons: SlotView[]; taken: Set<string>; unread: number }
  | {
      kind: 'institution_admin';
      students: number;
      teachers: number;
      outstanding: number;
      rollCalls: string;
      lessons: number;
    }
  | { kind: 'parent'; announcements: number; messages: number }
  | { kind: 'super_admin' };

async function loadHome(me: Me): Promise<Result<HomeData>> {
  if (me.profile.role === 'student') {
    const [slots, hw, att, grades, invoices] = await Promise.all([
      listSlots(supabase),
      listHomework(supabase),
      listMyAttendance(supabase),
      listMyGrades(supabase),
      listMyInvoices(supabase),
    ]);
    if (!slots.ok) return slots;
    if (!hw.ok) return hw;
    if (!att.ok) return att;
    if (!grades.ok) return grades;
    if (!invoices.ok) return invoices;
    return ok({
      kind: 'student',
      lessons: slots.data.filter((s) => s.weekday === weekdayOf(me.today)),
      pending: hw.data
        .filter((h) => homeworkBucket(h, me.today) !== 'done')
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
      rate: attendanceRate(countStatuses(att.data)),
      average: weightedAverage20(
        grades.data.map((m) => ({
          score: m.score,
          absent: m.absent,
          maxScore: m.maxScore,
          coefficient: m.coefficient,
          subjectId: m.subjectId,
        })),
      ),
      owed: invoices.data.filter((i) => !i.voided).reduce((n, i) => n + i.balanceCentimes, 0),
    });
  }
  if (me.profile.role === 'teacher') {
    const [lessons, unread] = await Promise.all([
      getDayLessons(supabase, { date: me.today, teacherId: me.userId }),
      getUnreadCounts(supabase),
    ]);
    if (!lessons.ok) return lessons;
    return ok({
      kind: 'teacher',
      lessons: lessons.data.map((l) => l.slot),
      taken: new Set(lessons.data.filter((l) => l.taken).map((l) => l.slot.id)),
      unread: unread.messages,
    });
  }
  if (me.profile.role === 'institution_admin') {
    const [students, teachers, finance, lessons] = await Promise.all([
      countPeople(supabase, 'student'),
      countPeople(supabase, 'teacher'),
      getFinanceSummary(supabase, me.today),
      getDayLessons(supabase, { date: me.today }),
    ]);
    if (!students.ok) return students;
    if (!teachers.ok) return teachers;
    if (!finance.ok) return finance;
    if (!lessons.ok) return lessons;
    return ok({
      kind: 'institution_admin',
      students: students.data.active,
      teachers: teachers.data.active,
      outstanding: finance.data.outstandingCentimes,
      rollCalls: `${String(lessons.data.filter((l) => l.taken).length)}/${String(lessons.data.length)}`,
      lessons: lessons.data.length,
    });
  }
  if (me.profile.role === 'parent')
    return ok({ kind: 'parent', ...(await getUnreadCounts(supabase)) });
  return ok({ kind: 'super_admin' });
}

function News({
  state,
  reload,
}: {
  state: Loaded<AnnouncementView[]>;
  reload: () => Promise<void>;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <SectionTitle>{t('home.news')}</SectionTitle>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            router.push('/more/announcements');
          }}
          className="min-h-11 justify-center"
        >
          <Text className="text-sm font-semibold text-primary">{t('design.viewAll')}</Text>
        </Pressable>
      </View>
      <Async state={state} retry={reload}>
        {(items) =>
          items.length === 0 ? (
            <Empty icon="announcements" hint={t('design.emptyHint')}>
              {t('announcements.empty')}
            </Empty>
          ) : (
            <View className="border-t border-border">
              {items.map((a, index) => (
                <Pressable
                  key={a.id}
                  accessibilityRole="button"
                  onPress={() => {
                    router.push(`/more/announcements/${a.id}`);
                  }}
                  className={`gap-3 py-5 ${index === items.length - 1 ? '' : 'border-b border-border'}`}
                  style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                >
                  <View className="flex-row items-center gap-2">
                    <View
                      accessible={false}
                      className={`size-1.5 rounded-full ${a.read ? 'bg-text-muted' : 'bg-accent'}`}
                    />
                    <Text className="flex-1 text-[13px] font-medium text-text-muted">
                      {t('announcements.by', { name: a.authorName })}
                    </Text>
                    {a.pinned ? <Pill tone="warning">{t('announcements.pinned')}</Pill> : null}
                  </View>
                  <View className="flex-row items-center gap-4">
                    <Text
                      className="flex-1 text-lg font-semibold leading-7 tracking-[-0.4px] text-text"
                      numberOfLines={2}
                    >
                      {a.title}
                    </Text>
                    <Icon name="arrow" />
                  </View>
                  {index === 0 ? (
                    <Text className="text-base leading-6 text-text-muted" numberOfLines={2}>
                      {a.body}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          )
        }
      </Async>
    </View>
  );
}

function QuickAccess() {
  const { t } = useTranslation();
  const me = useMe();
  const items: {
    key: IconName;
    label: string;
    path:
      | '/more/grades'
      | '/more/attendance'
      | '/more/payments'
      | '/more/announcements'
      | '/more/documents'
      | '/messages';
  }[] =
    me.profile.role === 'student'
      ? [
          { key: 'grades', label: t('more.grades'), path: '/more/grades' },
          { key: 'attendance', label: t('more.attendance'), path: '/more/attendance' },
          { key: 'payments', label: t('more.payments'), path: '/more/payments' },
        ]
      : [
          { key: 'announcements', label: t('more.announcements'), path: '/more/announcements' },
          { key: 'documents', label: t('more.documents'), path: '/more/documents' },
          { key: 'messages', label: t('tabs.messages'), path: '/messages' },
        ];
  return (
    <View className="flex-row gap-3">
      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          onPress={() => {
            router.push(item.path);
          }}
          className="min-h-20 flex-1 items-center gap-2 py-2"
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <ModuleIcon name={item.key} />
          <Text className="text-center text-sm font-medium text-text">{item.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function HomeBody({ data, now }: { data: HomeData; now: number }) {
  const { t } = useTranslation();
  const me = useMe();
  const num = new Intl.NumberFormat(me.locale, { maximumFractionDigits: 2 });
  if (data.kind === 'super_admin') return <Empty>{t('home.platform')}</Empty>;
  if (data.kind === 'institution_admin')
    return (
      <View className="gap-6">
        <View className="gap-5 rounded-3xl bg-ink p-6">
          <Text className="text-[13px] font-semibold uppercase tracking-[1.5px] text-ink-muted">
            {t('home.schoolPulse')}
          </Text>
          <View className="flex-row gap-6">
            <View className="flex-1 gap-2">
              <Text className="font-mono text-[48px] leading-[55px] tracking-[-3px] text-ink-foreground">
                {num.format(data.students)}
              </Text>
              <Text className="text-sm text-ink-muted">{t('home.students')}</Text>
            </View>
            <View className="flex-1 gap-2 border-s border-ink-foreground/15 ps-6">
              <Text className="font-mono text-[48px] leading-[55px] tracking-[-3px] text-ink-foreground">
                {num.format(data.teachers)}
              </Text>
              <Text className="text-sm text-ink-muted">{t('home.teachers')}</Text>
            </View>
          </View>
          <Text className="border-t border-ink-foreground/15 pt-4 text-sm text-ink-muted">
            {t('design.lessonCount', { count: data.lessons })}
          </Text>
        </View>
        <MetricRail
          items={[
            { label: t('home.rollCalls'), value: data.rollCalls },
            { label: t('home.outstanding'), value: formatMoney(data.outstanding, me.locale) },
          ]}
        />
      </View>
    );
  if (data.kind === 'parent')
    return (
      <View className="gap-5 rounded-3xl bg-ink p-6">
        <Text className="text-[23px] font-semibold leading-8 tracking-[-0.6px] text-ink-foreground">
          {t('design.space')}
        </Text>
        <View className="flex-row gap-5">
          {(
            [
              {
                key: 'announcements',
                count: data.announcements,
                label: t('home.unreadAnnouncements'),
                path: '/more/announcements',
              },
              {
                key: 'messages',
                count: data.messages,
                label: t('home.unreadMessages'),
                path: '/messages',
              },
            ] as const
          ).map((item, index) => (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              onPress={() => {
                router.push(item.path);
              }}
              className={`min-h-24 flex-1 gap-2 ${index ? 'border-s border-ink-foreground/15 ps-5' : ''}`}
            >
              <Text className="font-mono text-[42px] tracking-[-2px] text-ink-foreground">
                {num.format(item.count)}
              </Text>
              <Text className="text-sm leading-5 text-ink-muted">{item.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  const firstTask = data.kind === 'student' ? data.pending[0] : undefined;
  return (
    <View className="gap-6">
      <DayFocus slots={data.lessons} now={now} />
      {data.kind === 'student' ? (
        <>
          {firstTask ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                router.push('/homework');
              }}
              className="flex-row items-start gap-4 border-s-[3px] border-accent bg-accent-soft/40 px-4 py-5"
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
            >
              <View className="flex-1 gap-2">
                <Text className="text-[13px] font-semibold uppercase tracking-[1px] text-accent">
                  {t('home.homeworkPending', { count: data.pending.length })}
                </Text>
                <Text className="text-base font-semibold leading-6 text-text" numberOfLines={2}>
                  {firstTask.title}
                </Text>
                <SubjectLabel name={firstTask.subjectName} color={firstTask.subjectColor} />
              </View>
              <Icon name="arrow" tone="accent" />
            </Pressable>
          ) : (
            <View className="flex-row items-center gap-3 py-1">
              <ModuleIcon name="check" compact />
              <Text className="flex-1 text-sm font-medium text-success">
                {t('home.allHomeworkDone')}
              </Text>
            </View>
          )}
          <MetricRail
            items={[
              {
                label: t('home.average'),
                value: data.average === null ? '–' : `${num.format(data.average)}/20`,
              },
              {
                label: t('home.attendance'),
                value: data.rate === null ? '–' : `${num.format(data.rate)} %`,
              },
            ]}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              router.push('/more/payments');
            }}
            className="min-h-12 flex-row items-center gap-3"
          >
            <ModuleIcon name="payments" compact />
            <Text className="flex-1 text-sm text-text-muted">{t('home.owed')}</Text>
            <Text className={`font-mono text-sm ${data.owed ? 'text-accent' : 'text-success'}`}>
              {formatMoney(data.owed, me.locale)}
            </Text>
            <Icon name="arrow" />
          </Pressable>
        </>
      ) : (
        <MetricRail
          items={[
            {
              label: t('home.rollCalls'),
              value: `${String(data.taken.size)}/${String(data.lessons.length)}`,
            },
            { label: t('home.unreadMessages'), value: num.format(data.unread) },
          ]}
        />
      )}
      {data.lessons.length ? (
        <View className="gap-2">
          <View className="flex-row items-center justify-between gap-3">
            <SectionTitle>{t('home.today')}</SectionTitle>
            <Text className="font-mono text-sm text-text-muted">
              {t('design.lessonCount', { count: data.lessons.length })}
            </Text>
          </View>
          <LessonLedger
            slots={data.lessons}
            now={now}
            today
            teacher={data.kind === 'teacher'}
            taken={data.kind === 'teacher' ? data.taken : undefined}
          />
        </View>
      ) : null}
    </View>
  );
}

export default function Home() {
  const { t } = useTranslation();
  const me = useMe();
  const home = useLoad(() => loadHome(me), `${me.userId}-${me.today}-home`);
  const news = useLoad(
    () => listAnnouncements(supabase, me.userId, { limit: 3 }),
    `${me.userId}-news`,
  );
  const now = useSchoolMinute(me.profile.institution?.timezone ?? 'Africa/Casablanca');
  const name = `${me.profile.firstName} ${me.profile.lastName}`;
  const date = new Intl.DateTimeFormat(me.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${me.today}T00:00:00Z`));
  return (
    <Screen
      titleTestID="greeting"
      title={t('home.greeting', { name: me.profile.firstName })}
      subtitle={date}
      onRefresh={async () => {
        await Promise.all([home.reload(), news.reload()]);
      }}
      toolbar={
        <View className="min-h-12 flex-row items-center gap-3 pb-1">
          <BrandMark compact />
          <View className="flex-1 gap-1">
            <Text className="text-sm font-semibold text-text" numberOfLines={1}>
              {me.profile.institution?.name ?? t('brand')}
            </Text>
            <Text className="text-[13px] text-text-muted">{t(`roles.${me.profile.role}`)}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('more.settings')}
            onPress={() => {
              router.push('/more/settings');
            }}
          >
            <Avatar name={name} />
          </Pressable>
        </View>
      }
    >
      <Async state={home.state} retry={home.reload}>
        {(data) => <HomeBody data={data} now={now} />}
      </Async>
      {me.profile.role === 'super_admin' ? null : (
        <>
          <QuickAccess />
          <News state={news.state} reload={news.reload} />
        </>
      )}
    </Screen>
  );
}
