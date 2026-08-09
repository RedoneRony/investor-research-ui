/**
 * Proxies the search prompt to the NestJS leads pipeline. Keeping this server-side
 * means the browser never talks to the backend directly (no CORS, token stays put).
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

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
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : 502 });
  } catch {
    return NextResponse.json(
      {
        error: `Can't reach the backend at ${BACKEND_URL}. Start it (npm run start:dev in brave-investor-research) and try again.`,
      },
      { status: 503 },
    );
  }
}
