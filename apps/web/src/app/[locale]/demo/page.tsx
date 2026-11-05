import { GraduationCap, HeartHandshake, School, Users, Info, ShieldCheck } from 'lucide-react';
import { getFormatter, getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { demoLogin } from '@/app/actions/demo';
import { SiteFooter } from '@/components/marketing/closing';
import { CourtyardLines } from '@/components/marketing/courtyard-lines';
import { DemoEntry } from '@/components/marketing/demo-entry';
import { SiteHeader } from '@/components/site-header';
import { Mark } from '@/components/ui/logo';
import { serverEnv } from '@/env.server';
import { demoAccounts, type DemoKey } from '@/lib/demo-accounts';

const icons = { admin: School, teacher: Users, student: GraduationCap, parent: HeartHandshake };
const tones = {
  admin: 'text-primary',
  teacher: 'text-accent',
  student: 'text-success',
  parent: 'text-info',
};

export default async function DemoPage() {
  if (!serverEnv.DEMO_PASSWORD) notFound();
  const [t, s, preview, locale, f] = await Promise.all([
    getTranslations('demoSchool'),
    getTranslations('studio'),
    getTranslations('home.preview'),
    getLocale(),
    getFormatter(),
  ]);
  const keys = Object.keys(demoAccounts) as DemoKey[];
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-12 md:px-10 md:py-16">
        <header className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:gap-20">
          <div>
            <p className="eyebrow text-accent">{t('eyebrow')}</p>
            <h1 className="display public-page-title mt-5 max-w-3xl">{t('title')}</h1>
          </div>
          <p className="max-w-xl text-base leading-8 text-text-muted lg:pb-1">{t('intro')}</p>
        </header>
        <div className="demo-portal mt-12 lg:mt-16">
          <aside className="demo-campus">
            <CourtyardLines className="demo-campus-lines" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start gap-5 lg:flex-1 lg:flex-col lg:gap-0">
                <Mark className="size-9 shrink-0 text-ink-foreground lg:size-10" />
                <div className="min-w-0 lg:my-auto lg:py-16">
                  <p className="text-xs text-ink-muted">{s('school')}</p>
                  <h2 className="display mt-3 max-w-xs text-3xl leading-tight tracking-tight sm:text-4xl lg:mt-4 lg:text-5xl">
                    {preview('school')}
                  </h2>
                  <span className="mt-6 hidden h-px w-12 bg-ink-muted/50 lg:block" aria-hidden />
                </div>
              </div>
              <p className="mt-7 flex items-center gap-2 border-t border-ink-muted/25 pt-5 text-xs text-ink-muted lg:mt-0">
                <ShieldCheck className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
                {s('protected')}
              </p>
            </div>
          </aside>
          <ul className="min-w-0 divide-y divide-border">
            {keys.map((key, i) => {
              const Icon = icons[key];
              return (
                <li
                  key={key}
                  className={`demo-role ${key === 'admin' ? 'demo-role-featured' : ''}`}
                >
                  <span className="demo-role-number font-mono tabular-nums" aria-hidden>
                    {f.number(i + 1, { minimumIntegerDigits: 2 })}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`size-4 shrink-0 ${tones[key]}`}
                        strokeWidth={1.5}
                        aria-hidden
                      />
                      <h2 className="display text-3xl leading-tight tracking-tight">
                        {t(`roles.${key}.name`)}
                      </h2>
                    </div>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-text-muted">
                      {t(`roles.${key}.body`)}
                    </p>
                    <form action={demoLogin} className="mt-4">
                      <input type="hidden" name="account" value={key} />
                      <input type="hidden" name="locale" value={locale} />
                      <DemoEntry label={t('enter')} featured={key === 'admin'} />
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <p className="mt-7 flex max-w-3xl items-start gap-3 text-xs leading-6 text-text-muted">
          <Info className="mt-1 size-4 shrink-0" aria-hidden />
          {t('note')}
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
