import type { HomeworkView, MyGrade } from '@tadriss/shared';
import { ArrowUpRight } from 'lucide-react';
import { getFormatter, getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Badge } from '../ui/badge';
import { EmptyLine } from './dash-parts';

/** Read-only briefings shared with the selected child's parent dashboard. */
export async function StudentWork({
  items,
  today,
  href,
}: {
  items: HomeworkView[];
  today: string;
  href: string;
}) {
  const [t, f] = await Promise.all([getTranslations('dashboard.student'), getFormatter()]);
  if (items.length === 0) return <EmptyLine>{t('noHomework')}</EmptyLine>;
  return (
    <ul className="briefing-list">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={href} className="briefing-task">
            <span className="briefing-task-mark" aria-hidden />
            <span className="briefing-task-copy">
              <strong dir="auto">
                <bdi>{item.title}</bdi>
              </strong>
              <span dir="auto">
                <bdi>{item.subjectName}</bdi>
              </span>
            </span>
            <Badge tone={item.dueDate < today ? 'danger' : 'neutral'}>
              {f.dateTime(new Date(`${item.dueDate}T00:00:00Z`), {
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC',
              })}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export async function StudentMarks({ items, href }: { items: MyGrade[]; href: string }) {
  const [t, f] = await Promise.all([getTranslations('dashboard.student'), getFormatter()]);
  if (items.length === 0) return <EmptyLine>{t('noGrades')}</EmptyLine>;
  return (
    <ul className="briefing-list">
      {items.map((item) => (
        <li key={item.examId}>
          <Link href={href} className="briefing-result">
            <span className="briefing-task-copy">
              <strong dir="auto">
                <bdi>{item.subjectName}</bdi>
              </strong>
              <span dir="auto">
                <bdi>{item.title}</bdi>
              </span>
            </span>
            <span className="briefing-result-score font-mono tabular-nums">
              {item.absent || item.score === null ? (
                t('absent')
              ) : (
                <>
                  {f.number(item.score, { maximumFractionDigits: 2 })}
                  <small>/{f.number(item.maxScore, { maximumFractionDigits: 2 })}</small>
                </>
              )}
            </span>
            {item.score !== null && !item.absent ? (
              <span className="briefing-score-line" aria-hidden>
                <span
                  style={{
                    inlineSize: `${Math.min(100, Math.max(0, (item.score / item.maxScore) * 100))}%`,
                  }}
                />
              </span>
            ) : null}
            <ArrowUpRight className="briefing-result-arrow rtl-flip size-3.5" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );
}
