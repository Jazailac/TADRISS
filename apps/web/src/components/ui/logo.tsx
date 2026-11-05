import { useTranslations } from 'next-intl';
import { cx } from './cx';

/**
 * An open courtyard arch, a familiar silhouette in Moroccan school architecture.
 * Drawn with currentColor so it follows the surrounding text colour.
 */
export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={cx('size-7', className)}>
      <path d="M5 28V13a11 11 0 0 1 22 0v15h-7V13a4 4 0 0 0-8 0v15Z" fill="currentColor" />
      <path d="M15 22h2v6h-2z" fill="currentColor" />
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
      <Mark className={tone === 'primary' ? 'text-primary' : 'text-ink-foreground'} />
      <span className="display text-[1.4rem] leading-none font-semibold tracking-tight">
        {t('brand')}
      </span>
    </span>
  );
}
