import { ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Logo, Mark } from '@/components/ui/logo';
import { Link } from '@/i18n/navigation';
import { WorkflowPreview } from '@/components/marketing/workflow-preview';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('studio');
  const nav = useTranslations('nav');
  return (
    <div className="grid min-h-dvh lg:grid-cols-[0.95fr_1.05fr]">
      <aside className="auth-architecture hidden flex-col justify-between p-12 xl:p-16 lg:flex">
        <Logo className="text-ink-foreground" tone="ink" />
        <div className="relative my-12">
          <div className="mx-auto max-w-sm rotate-[-3deg] rounded-2xl border border-border bg-background p-5 text-text shadow-lg">
            <WorkflowPreview module="attendance" />
          </div>
          <div className="relative ms-auto -mt-3 flex w-max items-center gap-3 rounded-xl border border-ink-muted/30 bg-ink px-5 py-4 text-sm shadow-lg">
            <Mark className="size-5 text-ink-muted" />
            {t('protected')}
            <ShieldCheck className="size-4 text-ink-muted" aria-hidden />
          </div>
        </div>
        <div>
          <p className="font-mono text-xs tracking-widest text-ink-muted">{t('authEyebrow')}</p>
          <p className="display mt-5 max-w-md text-5xl">{t('authTitle')}</p>
          <p className="mt-5 max-w-sm leading-relaxed text-ink-muted">{t('authBody')}</p>
        </div>
        <p className="mt-10 text-xs text-ink-muted">{t('footerNote')}</p>
      </aside>
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-text-muted hover:text-primary"
            aria-label={nav('home')}
          >
            <span className="lg:hidden">
              <Logo />
            </span>
            <span className="hidden lg:inline">{t('returnHome')}</span>
            <ArrowUpRight className="rtl-flip hidden size-4 lg:block" aria-hidden />
          </Link>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-[29rem] flex-1 flex-col justify-center py-10">
          <div className="auth-card rounded-3xl border border-border bg-surface p-6 sm:p-9">
            {children}
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-text-muted">
            <ShieldCheck className="size-4 shrink-0" aria-hidden />
            {t('secure')}
          </p>
        </main>
      </div>
    </div>
  );
}
