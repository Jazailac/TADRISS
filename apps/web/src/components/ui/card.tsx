import type { ComponentProps } from 'react';
import { cx } from './cx';

export function Card({ className, ...rest }: ComponentProps<'div'>) {
  return (
    <div
      {...rest}
      className={cx('rounded-xl border border-border bg-surface shadow-sm', className)}
    />
  );
}
