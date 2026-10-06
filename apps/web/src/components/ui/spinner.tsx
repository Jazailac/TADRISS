import { useTranslations } from 'next-intl';
import { cx } from './cx';

/** Accessible spinner. Inherits the current text colour. */
export function Spinner({ className, label = true }: { className?: string; label?: boolean }) {
  const t = useTranslations('common');
  return (
    <span role="status" className="inline-flex">
      <span
        aria-hidden
        className={cx(
          'size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
          className,
        )}
      />
      {label ? <span className="sr-only">{t('loading')}</span> : null}
    </span>
  );
}
