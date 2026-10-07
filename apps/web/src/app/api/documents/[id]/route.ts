import { getDocumentDownloadUrl } from '@tadriss/shared';
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { getServerClient } from '@/lib/supabase/server';

/**
 * Download: checks the session, lets RLS decide whether this person can see the document, then
 * redirects to a 60-second signed URL. The file is never public and the URL is never stored.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });

  const supabase = await getServerClient();
  const { error: authError } = await supabase.auth.getUser();
  if (authError) return new NextResponse(null, { status: 401 });

  const res = await getDocumentDownloadUrl(supabase, id);
  if (!res.ok) return new NextResponse(null, { status: res.error === 'not_found' ? 404 : 500 });
  const response = NextResponse.redirect(res.data.url, 302);
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
