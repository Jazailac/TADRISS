'use client';

import { Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useOptimistic, useTransition } from 'react';
import { toggleHomeworkDoneAction } from '@/app/actions/homework';
import { cx } from '../ui/cx';
import { useToast } from '../ui/toast';

/**
 * The student's tick. It flips instantly (optimistic) and rolls back with an error toast if the
 * server refuses, so ticking never feels slow.
 */
export function DoneToggle({ id, title, done }: { id: string; title: string; done: boolean }) {
  const t = useTranslations('homework.student');
  const e = useTranslations('errors');
  const toast = useToast();
  const [, start] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(done);

  const flip = () => {
    const next = !optimistic;
    start(async () => {
      setOptimistic(next);
      const res = await toggleHomeworkDoneAction(id, next);
      if (!res.ok) toast.error(e(res.error));
    });
  };

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimistic}
      aria-label={optimistic ? t('unmark', { title }) : t('mark', { title })}
      onClick={flip}
      className={cx(
        'grid size-11 shrink-0 place-items-center rounded-full ring-1 ring-inset transition-colors',
        optimistic
          ? 'bg-success text-primary-foreground ring-success'
          : 'bg-surface text-transparent ring-border-strong hover:bg-surface-muted hover:text-text-muted',
      )}
    >
      <Check className="size-5" aria-hidden />
    </button>
  );
}
