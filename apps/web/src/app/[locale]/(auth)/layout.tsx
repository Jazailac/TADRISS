import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { LocaleSwitcher } from '@/components/locale-switcher';
import { ThemeToggle } from '@/components/theme-toggle';
import { Logo } from '@/components/ui/logo';
import { ZelligePattern } from '@/components/ui/pattern';
import { Link } from '@/i18n/navigation';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('auth.panel');
  const nav = useTranslations('nav');
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(0,0.9fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="rounded-md text-text" aria-label={nav('home')}>
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <LocaleSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <main className="mx-auto flex w-full max-w-[25rem] flex-1 flex-col justify-center py-12">
          {children}
        </main>
      </div>

      <aside className="relative isolate hidden overflow-hidden bg-ink text-ink-foreground lg:flex lg:flex-col lg:justify-end lg:p-14">
        <ZelligePattern
          className="-z-10 text-ink-foreground/[0.06] [mask-image:linear-gradient(to_bottom,black,transparent_85%)]"
          size={80}
        />
        <div
          aria-hidden
          className="absolute -end-32 -top-32 -z-10 size-[30rem] rounded-full bg-primary/40 blur-[120px]"
        />
        <p className="eyebrow text-accent">{t('eyebrow')}</p>
        <p className="display mt-5 max-w-md text-5xl font-medium">{t('title')}</p>
        <p className="mt-5 max-w-sm text-lg leading-relaxed text-ink-muted">{t('body')}</p>
      </aside>
    </div>
  );
}
