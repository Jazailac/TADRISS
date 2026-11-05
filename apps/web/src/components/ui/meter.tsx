import { cx } from './cx';

/**
 * Token-styled bar. `tone="capacity"` (default) turns the fill to the accent colour when full, which
 * is a warning for seats; use `tone="neutral"` when a full bar is good news (e.g. a 100% rate).
 */
export function Meter({
  value,
  max,
  label,
  tone = 'capacity',
  className,
}: {
  value: number;
  max: number;
  label: string;
  tone?: 'capacity' | 'neutral';
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
        className={cx(
          'h-full rounded-full',
          full && tone === 'capacity' ? 'bg-accent' : 'bg-primary',
        )}
        style={{ width: `${(clamped / max) * 100}%` }}
      />
    </div>
  );
}
