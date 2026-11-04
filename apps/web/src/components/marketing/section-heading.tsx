import type { ReactNode } from 'react';
import { cx } from '../ui/cx';

export function SectionHeading({
  eyebrow,
  title,
  body,
  align = 'start',
  className,
}: {
  eyebrow: string;
  title: ReactNode;
  body?: string;
  align?: 'start' | 'center';
  className?: string;
}) {
  return (
    <div className={cx('max-w-2xl', align === 'center' && 'mx-auto text-center', className)}>
      <p className="eyebrow text-accent">{eyebrow}</p>
      <h2 className="display mt-4 text-[length:var(--type-title)] font-medium leading-[1.1] tracking-tight text-balance">
        {title}
      </h2>
      {body ? <p className="mt-5 max-w-xl text-base leading-7 text-text-muted">{body}</p> : null}
    </div>
  );
}
