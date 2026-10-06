import { Check, Circle } from 'lucide-react';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { Card } from '../ui/card';
import { cx } from '../ui/cx';

export type Step = { key: string; label: string; detail: string; done: boolean };

/** Shared home layout for every role: greeting + a short, honest "what's next" list. */
export function Welcome({
  firstName,
  subtitle,
  steps,
}: {
  firstName: string;
  subtitle: string;
  steps: Step[];
}) {
  const t = useTranslations('app');
  const format = useFormatter();
  const now = useNow();
  const done = steps.filter((s) => s.done).length;
  return (
    <div className="mx-auto grid max-w-4xl gap-8">
      <div>
        <p className="eyebrow">
          {format.dateTime(now, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}
        </p>
        <h1 className="display mt-3 text-4xl font-medium">
          {t.rich('greeting', { name: firstName, n: (chunks) => <bdi>{chunks}</bdi> })}
        </h1>
        <p className="mt-2 text-text-muted">{subtitle}</p>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-4">
          <h2 className="font-semibold">{t('nextSteps')}</h2>
          <span className="font-mono text-xs text-text-muted tabular-nums">
            {t('progress', { done, total: steps.length })}
          </span>
        </div>
        <ol className="divide-y divide-border">
          {steps.map((s) => (
            <li key={s.key} className="flex gap-4 px-6 py-4">
              <span
                className={cx(
                  'mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-1',
                  s.done
                    ? 'bg-primary text-primary-foreground ring-primary'
                    : 'text-text-muted ring-border-strong',
                )}
              >
                {s.done ? (
                  <Check className="size-3.5" strokeWidth={3} aria-hidden />
                ) : (
                  <Circle className="size-2 fill-current" aria-hidden />
                )}
              </span>
              <div>
                <p
                  className={cx(
                    'font-medium',
                    s.done && 'text-text-muted line-through decoration-border-strong',
                  )}
                >
                  {s.label}
                </p>
                <p className="text-sm text-text-muted">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
