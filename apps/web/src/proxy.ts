import { createServerClient } from '@supabase/ssr';
import type { Database } from '@tadriss/shared';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { env } from '@/env';
import { routing } from '@/i18n/routing';

const intl = createIntlMiddleware(routing);

/**
 * Runs on every page request: resolves the locale, then refreshes the Supabase session
 * cookie. Uses the anon key only — never the service role here.
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
  // Validates and refreshes the token. Role-based redirects arrive in Phase 1.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: ['/((?!api|auth/callback|_next|_vercel|.*\\..*).*)'],
};
