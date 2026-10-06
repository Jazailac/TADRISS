import { useId } from 'react';
import { cx } from './cx';

/**
 * Tiled zellige lattice (eight-pointed stars on a square grid). Decorative only.
 * Colour and opacity come from the className, e.g. `text-primary/10`.
 */
export function ZelligePattern({ className, size = 56 }: { className?: string; size?: number }) {
  const id = useId();
  const h = size / 2;
  const s = size * 0.3;
  return (
    <svg aria-hidden className={cx('pointer-events-none absolute inset-0 size-full', className)}>
      <defs>
        <pattern id={id} width={size} height={size} patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <rect x={h - s / 2} y={h - s / 2} width={s} height={s} />
            <rect
              x={h - s / 2}
              y={h - s / 2}
              width={s}
              height={s}
              transform={`rotate(45 ${h} ${h})`}
            />
            <path
              d={`M0 ${h}H${h - s * 0.7}M${h + s * 0.7} ${h}H${size}M${h} 0V${h - s * 0.7}M${h} ${h + s * 0.7}V${size}`}
            />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
