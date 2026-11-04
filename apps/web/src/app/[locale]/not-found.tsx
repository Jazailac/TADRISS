import { useTranslations } from 'next-intl';
import { ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Logo } from '@/components/ui/logo';
import { Link } from '@/i18n/navigation';
export default function NotFound() {
  const t = useTranslations('notFound');
  const nav = useTranslations('nav');
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 py-12">
      <Link href="/" className="rounded-md" aria-label={nav('home')}>
        <Logo />
      </Link>
      <div className="public-recovery mt-10 w-full rounded-2xl border border-border bg-surface p-4 shadow-xs">
        <p
          aria-hidden
          className="pt-8 text-center font-mono text-xs tracking-[0.3em] text-text-muted"
        >
          {404}
        </p>
        <EmptyState
          heading="h1"
          title={t('title')}
          description={t('body')}
          action={<ButtonLink href="/">{t('backHome')}</ButtonLink>}
        />
      </div>
    </main>
  );
}
