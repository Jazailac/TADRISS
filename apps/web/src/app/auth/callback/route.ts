import { currentSession, defaultLocale, homePath, isLocale } from '@tadriss/shared';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/env';
import { getServerClient } from '@/lib/supabase/server';

/** Email-confirmation / magic-link landing: exchanges the PKCE code, then sends users home. */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const localeParam = url.searchParams.get('locale');
  const locale = isLocale(localeParam) ? localeParam : defaultLocale;
  const prefix = locale === defaultLocale ? '' : `/${locale}`;

  if (code) {
    const supabase = await getServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const session = await currentSession(supabase);
      if (session?.role)
        return NextResponse.redirect(
          new URL(`${prefix}${homePath[session.role]}`, env.NEXT_PUBLIC_APP_URL),
        );
    }
  }
  return NextResponse.redirect(new URL(`${prefix}/login?error=link`, env.NEXT_PUBLIC_APP_URL));
}
