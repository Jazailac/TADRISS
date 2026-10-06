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
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="display mt-4 text-4xl font-medium sm:text-5xl">{title}</h2>
      {body ? <p className="mt-5 text-lg leading-relaxed text-text-muted">{body}</p> : null}
    </div>
  );
}
