import { useFormatter, useTranslations } from 'next-intl';

/** A single balance proportion; the segments encode values, never an invented time series. */
export function CollectionInstrument({
  collected,
  outstanding,
}: {
  collected: number;
  outstanding: number;
}) {
  const t = useTranslations('workspace');
  const f = useFormatter();
  const total = collected + outstanding;
  if (total <= 0) return null;
  const fraction = Math.max(0, Math.min(1, collected / total));
  const segments = fraction * 16;
  return (
    <div className="collection-instrument">
      <p className="collection-instrument-label">
        <span>{t('collectedShare')}</span>
        <strong>{f.number(fraction, { style: 'percent', maximumFractionDigits: 0 })}</strong>
      </p>
      <div className="collection-segments" aria-hidden>
        {Array.from({ length: 16 }, (_, i) => (
          <span
            key={i}
            className={i + 1 <= segments ? 'is-filled' : i < segments ? 'is-partial' : undefined}
          />
        ))}
      </div>
      <progress
        value={collected}
        max={total}
        className="sr-only"
        aria-label={t('collectedShare')}
      />
    </div>
  );
}
