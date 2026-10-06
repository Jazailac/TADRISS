import { useTranslations } from 'next-intl';

export function Spinner({ className = 'size-6' }: { className?: string }) {
  const t = useTranslations('common');
  return (
    <span role="status" className="inline-flex">
      <span
        aria-hidden
        className={`${className} animate-spin rounded-full border-2 border-current border-t-transparent text-primary`}
      />
      <span className="sr-only">{t('loading')}</span>
    </span>
  );
}
