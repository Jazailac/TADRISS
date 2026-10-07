import { BookOpen, CalendarDays, Check, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { cx } from '../ui/cx';
import { EmptyState } from '../ui/empty-state';

export type Step = { key: string; label: string; detail: string; done: boolean };
export function Welcome({
  firstName,
  subtitle,
  steps,
  role = 'admin',
}: {
  firstName: string;
  subtitle: string;
  steps: Step[];
  role?: 'admin' | 'teacher' | 'student' | 'superAdmin';
}) {
  const t = useTranslations('app');
  const s = useTranslations('studio');
  const f = useFormatter();
  const now = useNow();
  const done = steps.filter((step) => step.done).length;
  const modules =
    role === 'student'
      ? (['schedule', 'grades', 'finance'] as const)
      : role === 'teacher'
        ? (['schedule', 'attendance', 'grades'] as const)
        : (['attendance', 'schedule', 'finance'] as const);
  return (
    <div className="mx-auto grid max-w-6xl gap-7">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">
            {f.dateTime(now, { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
          <h1 className="display mt-4 text-4xl md:text-5xl">
            {t.rich('greeting', { name: firstName, n: (chunks) => <bdi>{chunks}</bdi> })}
          </h1>
          <p className="mt-3 max-w-xl text-text-muted">{subtitle}</p>
        </div>
        <Badge tone="success" dot>
          {s('ready')}
        </Badge>
      </header>
      <div className="grid gap-4 sm:grid-cols-3">
        {modules.map((module, i) => (
          <Card key={module} className="p-5">
            <div className="flex items-center justify-between">
              <span
                className={cx(
                  'grid size-10 place-items-center rounded-xl',
                  i === 0
                    ? 'bg-primary-soft text-primary'
                    : i === 1
                      ? 'bg-accent-soft text-accent'
                      : 'bg-info-soft text-info',
                )}
              >
                {i === 0 ? (
                  <BookOpen className="size-4" aria-hidden />
                ) : i === 1 ? (
                  <CalendarDays className="size-4" aria-hidden />
                ) : (
                  <Sparkles className="size-4" aria-hidden />
                )}
              </span>
              <span className="font-mono text-xs text-text-muted">
                {f.number(i + 1, { minimumIntegerDigits: 2 })}
              </span>
            </div>
            <h2 className="mt-5 font-semibold">{s(module)}</h2>
            <p className="mt-1 text-xs text-text-muted">{s('waiting')}</p>
          </Card>
        ))}
      </div>
      <div className="grid items-start gap-6 xl:grid-cols-[1.3fr_0.8fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-border p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">{s('setup')}</h2>
              <span className="font-mono text-xs text-primary">
                {t('progress', { done, total: steps.length })}
              </span>
            </div>
            <p className="mt-2 text-sm text-text-muted">{s('setupBody')}</p>
            <progress
              value={done}
              max={steps.length}
              aria-label={s('setup')}
              className="mt-5 h-1.5 w-full overflow-hidden rounded-full accent-primary"
            />
          </div>
          <ol className="divide-y divide-border">
            {steps.map((step, i) => (
              <li key={step.key} className="flex gap-4 p-6">
                <span
                  className={cx(
                    'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-xs',
                    step.done
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-surface-muted text-text-muted',
                  )}
                >
                  {step.done ? <Check className="size-4" aria-hidden /> : f.number(i + 1)}
                </span>
                <div className="min-w-0">
                  <p className="font-medium">{step.label}</p>
                  <p className="mt-1 text-sm leading-relaxed text-text-muted">{step.detail}</p>
                  {!step.done ? (
                    <Badge tone="neutral" className="mt-3">
                      {s('waiting')}
                    </Badge>
                  ) : null}
                </div>
                {!step.done ? (
                  <ChevronRight
                    className="rtl-flip ms-auto mt-2 size-4 shrink-0 text-text-muted"
                    aria-hidden
                  />
                ) : null}
              </li>
            ))}
          </ol>
        </Card>
        <div className="grid gap-5">
          <Card className="p-7">
            <ShieldCheck className="size-6 text-primary" aria-hidden />
            <h2 className="display mt-5 text-2xl">{s('workspace')}</h2>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">{s('workspaceBody')}</p>
            <div className="mt-6 border-t border-border pt-4">
              <Badge tone="info">{s('protected')}</Badge>
            </div>
          </Card>
          <Card className="p-6">
            <p className="eyebrow">{s('help')}</p>
            <p className="mt-3 text-sm leading-relaxed text-text-muted">{s('helpBody')}</p>
          </Card>
        </div>
      </div>
      <Card>
        <EmptyState title={s('empty')} description={s('emptyBody')} />
      </Card>
    </div>
  );
}
