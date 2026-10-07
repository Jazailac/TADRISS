import { cx } from './cx';

const tones = [
  'bg-primary-soft text-primary',
  'bg-accent-soft text-accent',
  'bg-info-soft text-info',
  'bg-success-soft text-success',
  'bg-warning-soft text-warning',
] as const;

/** First user-perceived character of a string, in any script (Array.from keeps surrogate pairs). */
const initial = (s: string) => Array.from(s.trim())[0]?.toUpperCase() ?? '';

/** Initials avatar. The tone is derived from `seed` so a person keeps their colour everywhere. */
export function Avatar({
  first,
  last,
  seed,
  className,
}: {
  first: string;
  last: string;
  seed: string;
  className?: string;
}) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={cx(
        'grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold',
        tones[h % tones.length],
        className,
      )}
    >
      {initial(first)}
      {initial(last)}
    </span>
  );
}
