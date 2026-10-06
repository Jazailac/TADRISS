import { useTranslations } from 'next-intl';
import { cx } from './cx';

/**
 * The khatam, the eight-pointed star of Moroccan zellige: two squares, one rotated 45°.
 * Drawn with currentColor so it follows the surrounding text colour.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cx('size-7', className)}>
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <rect x="7" y="7" width="18" height="18" rx="1.5" />
        <rect x="7" y="7" width="18" height="18" rx="1.5" transform="rotate(45 16 16)" />
      </g>
      <circle cx="16" cy="16" r="3" fill="currentColor" />
    </svg>
  );
}

export function Logo({
  className,
  tone = 'primary',
}: {
  className?: string;
  tone?: 'primary' | 'ink';
}) {
  const t = useTranslations('nav');
  return (
    <span className={cx('inline-flex items-center gap-2.5', className)}>
      <Mark className={tone === 'primary' ? 'text-primary' : 'text-accent'} />
      <span className="display text-[1.4rem] leading-none font-semibold tracking-tight">
        {t('brand')}
      </span>
    </span>
  );
}
