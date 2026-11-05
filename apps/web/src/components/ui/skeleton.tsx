import { cx } from './cx';
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx('ui-skeleton rounded-md bg-surface-muted', className)} />;
}
