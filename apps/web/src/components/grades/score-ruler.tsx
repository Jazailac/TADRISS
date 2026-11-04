import { cx } from '../ui/cx';

/** The marker is the actual score; the ruler always spans the full assessment scale. */
export function ScoreRuler({
  value,
  max = 20,
  label,
  format,
  compact = false,
}: {
  value: number;
  max?: number;
  label: string;
  format: (value: number) => string;
  compact?: boolean;
}) {
  const percentage = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${format(value)} / ${format(max)}`}
      className={cx('score-ruler', compact && 'score-ruler-compact')}
    >
      <div className="score-ruler-track" aria-hidden>
        <span className="score-ruler-fill" style={{ inlineSize: `${percentage}%` }} />
        {[0, 0.25, 0.5, 0.75, 1].map((position) => (
          <span
            key={position}
            className={cx('score-ruler-tick', position === 0.5 && 'score-ruler-tick-major')}
            style={{ insetInlineStart: `${position * 100}%` }}
          >
            <span>{format(max * position)}</span>
          </span>
        ))}
        <span className="score-ruler-marker" style={{ insetInlineStart: `${percentage}%` }} />
      </div>
    </div>
  );
}
