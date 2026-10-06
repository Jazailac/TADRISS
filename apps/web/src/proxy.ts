import { createServerClient } from '@supabase/ssr';
import {
  areaFor,
  defaultLocale,
  homePath,
  locales,
  readClaims,
  type Database,
} from '@tadriss/shared';
import { NextResponse, type NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { env } from '@/env';
import { routing } from '@/i18n/routing';

const intl = createIntlMiddleware(routing);
const authPages = ['/login', '/signup'];

/** Splits `/ar/dashboard` into `{ locale: 'ar', path: '/dashboard' }` (fr has no prefix). */
function splitLocale(pathname: string) {
  const [, first, ...rest] = pathname.split('/');
  if ((locales as readonly string[]).includes(first ?? '') && first !== defaultLocale) {
    return { prefix: `/${first ?? ''}`, path: `/${rest.join('/')}` };
  }
  return { prefix: '', path: pathname };
}

/**
 * Runs on every page request: resolves the locale, refreshes the Supabase session cookie,
 * and enforces role areas. Uses the anon key only, never the service role.
 * RLS remains the real boundary; this only keeps people out of screens they can't use.
 */
export async function proxy(request: NextRequest) {
  const response = intl(request);

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        },
      },
    },
  );
  // Verifies the JWT and refreshes it if needed.
  const { data } = await supabase.auth.getClaims();
  const session = data ? readClaims(data.claims) : null;

  const { prefix, path } = splitLocale(request.nextUrl.pathname);
  const area = areaFor(path);

  const go = (to: string) => {
    const res = NextResponse.redirect(new URL(`${prefix}${to}`, request.url));
    for (const c of response.cookies.getAll()) res.cookies.set(c);
    return res;
  };

  if (area) {
    if (!session?.role) return go(`/login?next=${encodeURIComponent(path)}`);
    if (session.role !== area) return go(homePath[session.role]);
  } else if (session?.role && authPages.includes(path)) {
    return go(homePath[session.role]);
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|auth/callback|_next|_vercel|.*\\..*).*)'],
};
