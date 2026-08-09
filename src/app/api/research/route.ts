import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

export async function POST(req: NextRequest) {
  let body: { queries?: string[]; query?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const queries = body.queries ?? (body.query ? [body.query] : []);
  if (queries.length === 0) {
    return NextResponse.json(
      { error: 'Enter at least one search query.' },
      { status: 400 },
    );
  }

  try {
    // We only want JSON rows in the UI; skip the backend's CSV file write.
    const res = await fetch(`${BACKEND_URL}/research/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries, export: false }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Backend returned ${res.status}. ${text.slice(0, 200)}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        error: `Can't reach the research backend at ${BACKEND_URL}. Start it (npm run start:dev in the brave-investor-research project) and try again.`,
      },
      { status: 503 },
    );
  }
}
