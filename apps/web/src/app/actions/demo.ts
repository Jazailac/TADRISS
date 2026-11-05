'use server';

import { defaultLocale, homePath, isLocale, signIn, type Role } from '@tadriss/shared';
import { redirect } from '@/i18n/navigation';
import { serverEnv } from '@/env.server';
import { demoAccounts, type DemoKey } from '@/lib/demo-accounts';
import { getServerClient } from '@/lib/supabase/server';

export async function demoLogin(fd: FormData): Promise<void> {
  const password = serverEnv.DEMO_PASSWORD;
  const key = fd.get('account');
  const l = fd.get('locale');
  const locale = isLocale(l) ? l : defaultLocale;
  if (!password || typeof key !== 'string' || !(key in demoAccounts)) {
    redirect({ href: '/login', locale });
    return;
  }
  const supabase = await getServerClient();
  const res = await signIn(supabase, { email: demoAccounts[key as DemoKey], password });
  const role: Role = res.ok ? (res.data.role ?? 'student') : 'student';
  redirect({ href: res.ok ? homePath[role] : '/login', locale });
}
