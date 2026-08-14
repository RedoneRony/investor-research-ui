/**
 * Streams a server-generated CSV back through the frontend so the browser can
 * download the exact file the backend wrote to disk. Call as:
 *   /api/leads/download?file=leads-123.csv
 */
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://13.235.245.137:3000';

export async function GET(req: NextRequest) {
  const file = req.nextUrl.searchParams.get('file');
  if (!file) {
    return NextResponse.json({ error: 'Missing "file" query parameter.' }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/leads/download/${encodeURIComponent(file)}`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      return NextResponse.json({ error: 'CSV not found on server.' }, { status: res.status });
    }
    const text = await res.text();
    return new NextResponse(text, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${file}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: `Can't reach the backend at ${BACKEND_URL}.` }, { status: 503 });
  }
}
