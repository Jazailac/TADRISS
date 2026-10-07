import { cx } from './cx';

/** Token-styled capacity bar. The fill turns to the accent colour when the class is full. */
export function Meter({
  value,
  max,
  label,
  className,
}: {
  value: number;
  max: number;
  label: string;
  className?: string;
}) {
  const clamped = Math.min(Math.max(value, 0), max);
  const full = clamped >= max;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={max}
      className={cx('h-1.5 w-full overflow-hidden rounded-full bg-surface-muted', className)}
    >
      <div
        className={cx('h-full rounded-full', full ? 'bg-accent' : 'bg-primary')}
        style={{ width: `${(clamped / max) * 100}%` }}
      />
    </div>
  );
}
