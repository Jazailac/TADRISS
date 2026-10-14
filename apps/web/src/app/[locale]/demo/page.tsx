import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { demoLogin } from '@/app/actions/demo';
import { SiteFooter } from '@/components/marketing/closing';
import { SiteHeader } from '@/components/site-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { serverEnv } from '@/env.server';
import { demoAccounts, type DemoKey } from '@/lib/demo-accounts';

export default async function DemoPage() {
  if (!serverEnv.DEMO_PASSWORD) notFound();
  const [t, locale] = await Promise.all([getTranslations('demoSchool'), getLocale()]);
  const keys = Object.keys(demoAccounts) as DemoKey[];
  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-3xl grid-cols-1 gap-8 px-5 py-14 md:px-8">
        <header>
          <p className="eyebrow">{t('eyebrow')}</p>
          <h1 className="display mt-4 text-4xl md:text-5xl">{t('title')}</h1>
          <p className="mt-3 text-text-muted">{t('intro')}</p>
        </header>
        <ul className="grid gap-4 sm:grid-cols-2">
          {keys.map((k) => (
            <li key={k}>
              <Card className="flex h-full flex-col gap-3 p-5">
                <h2 className="font-semibold">{t(`roles.${k}.name`)}</h2>
                <p className="flex-1 text-sm text-text-muted">{t(`roles.${k}.body`)}</p>
                <form action={demoLogin}>
                  <input type="hidden" name="account" value={k} />
                  <input type="hidden" name="locale" value={locale} />
                  <Button type="submit">{t('enter')}</Button>
                </form>
              </Card>
            </li>
          ))}
        </ul>
        <p className="text-sm text-text-muted">{t('note')}</p>
      </main>
      <SiteFooter />
    </>
  );
}
