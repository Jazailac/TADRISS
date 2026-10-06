import '../globals.css';
import { dir } from '@tadriss/shared';
import type { Metadata, Viewport } from 'next';
import { DM_Sans, JetBrains_Mono, Noto_Sans_Arabic, Plus_Jakarta_Sans } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { ThemeProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { env } from '@/env';
import { routing } from '@/i18n/routing';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });
const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });
const arabic = Noto_Sans_Arabic({ subsets: ['arabic'], variable: '--font-arabic' });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata');
  return {
    metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
    title: { default: t('title'), template: `%s · ${t('title')}` },
    description: t('description'),
  };
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

// The locale comes from next/root-params (validated in i18n/request.ts → 404 if unknown).
export default async function LocaleLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      dir={dir(locale)}
      suppressHydrationWarning
      className={`${jakarta.variable} ${dmSans.variable} ${jetbrains.variable} ${arabic.variable}`}
    >
      <body className="min-h-dvh">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <NextIntlClientProvider>{children}</NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
