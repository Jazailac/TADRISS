import { NextResponse } from 'next/server';

/** Liveness probe for the host and uptime monitors: no auth, no data, never cached. */
export function GET() {
  return NextResponse.json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
}
