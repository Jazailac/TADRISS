import { defaultLocale, isLocale } from '@tadriss/shared';
import { NextResponse, type NextRequest } from 'next/server';
import { env } from '@/env';
import { getServerClient } from '@/lib/supabase/server';

/**
 * Invitation landing. Admin-sent invites cannot use PKCE (no code verifier exists in the
 * invitee's browser), so the email carries a token hash that we verify server-side. On success
 * the invitee has a session and must choose a password before anything else.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  const localeParam = url.searchParams.get('locale');
  const locale = isLocale(localeParam) ? localeParam : defaultLocale;
  const prefix = locale === defaultLocale ? '' : `/${locale}`;
  const to = (path: string) =>
    NextResponse.redirect(new URL(`${prefix}${path}`, env.NEXT_PUBLIC_APP_URL));

  if (tokenHash && type === 'invite') {
    const supabase = await getServerClient();
    const { error } = await supabase.auth.verifyOtp({ type: 'invite', token_hash: tokenHash });
    if (!error) return to('/set-password');
  }
  return to('/login?error=link');
}
