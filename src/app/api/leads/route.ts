/**
 * Proxies the search prompt to the NestJS leads pipeline. Keeping this server-side
 * means the browser never talks to the backend directly (no CORS, token stays put).
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://13.235.245.137:3000';

// The backend extends its own socket timeout to 10 minutes for /leads/search
// with enrichment enabled (it visits every result's site for published
// emails). Node's fetch() otherwise gives up on response headers after 5
// minutes, which would kill slow-but-healthy enrich requests early — so this
// proxy fetch needs a matching, explicit budget.
const BACKEND_TIMEOUT_MS = 9.5 * 60 * 1000;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/leads/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(BACKEND_TIMEOUT_MS),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : 502 });
  } catch (err) {
    const timedOut = err instanceof Error && err.name === 'TimeoutError';
    return NextResponse.json(
      {
        error: timedOut
          ? 'The search is taking too long (enrichment can be slow with many results — try fewer queries or a smaller enrich limit).'
          : `Can't reach the backend at ${BACKEND_URL}. Start it (npm run start:dev in brave-investor-research) and try again.`,
      },
      { status: timedOut ? 504 : 503 },
    );
  }
}
