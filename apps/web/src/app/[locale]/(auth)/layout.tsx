import { ArrowLeft, Check, ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Logo } from '@/components/ui/logo';
import { Link } from '@/i18n/navigation';
import { CourtyardLines } from '@/components/marketing/courtyard-lines';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('studio');
  const nav = useTranslations('nav');
  const sample = useTranslations('home.features.visual');
  const preview = useTranslations('home.preview');
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="auth-architecture auth-stage hidden min-w-0 flex-col p-10 lg:flex xl:p-14">
        <CourtyardLines className="auth-stage-lines" />
        <Link href="/" className="relative w-fit rounded-md" aria-label={nav('home')}>
          <Logo className="text-ink-foreground" tone="ink" />
        </Link>
        <div className="relative my-auto py-12 xl:py-16">
          <p className="eyebrow text-ink-muted">{t('authEyebrow')}</p>
          <p className="display auth-stage-title mt-6 max-w-lg">{t('authTitle')}</p>
          <p className="mt-6 max-w-sm text-sm leading-7 text-ink-muted">{t('authBody')}</p>
          <div className="auth-ledger mt-10 max-w-md">
            <div className="flex justify-between gap-4 border-b border-ink-muted/25 pb-4 text-xs">
              <span>{preview('school')}</span>
              <span className="text-ink-muted">{t('attendance')}</span>
            </div>
            <ul className="mt-2 divide-y divide-ink-muted/15">
              {(['s1', 's2', 's3'] as const).map((name) => (
                <li key={name} className="flex items-center gap-3 py-3.5 text-sm">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-ink-muted/30 text-xs text-ink-muted">
                    {sample(name).slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{sample(name)}</span>
                  <Check className="size-3.5 text-ink-muted" aria-hidden />
                  <span className="text-xs text-ink-muted">{t('present')}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[0.625rem] text-ink-muted">{t('preview')}</p>
          </div>
        </div>
        <p className="relative border-t border-ink-muted/25 pt-6 text-xs text-ink-muted">
          {t('footerNote')}
        </p>
      </aside>
      <div className="auth-form-side flex min-w-0 flex-col bg-background px-5 py-6 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md text-sm text-text-muted transition-colors hover:text-primary"
            aria-label={nav('home')}
          >
            <span className="lg:hidden">
              <Logo />
            </span>
            <ArrowLeft className="rtl-flip hidden size-4 lg:block" aria-hidden />
            <span className="hidden lg:inline">{t('returnHome')}</span>
          </Link>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[27rem] flex-1 flex-col justify-center py-10 sm:py-14">
          <div className="auth-card">{children}</div>
          <p className="mt-8 flex items-center gap-2 border-t border-border pt-6 text-xs leading-5 text-text-muted">
            <ShieldCheck className="size-4 shrink-0 text-primary" strokeWidth={1.5} aria-hidden />
            {t('secure')}
          </p>
        </main>
      </div>
    </div>
  );
}
