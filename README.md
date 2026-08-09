# Ledger — Investor Research UI (Next.js)

Frontend for the `brave-investor-research` NestJS backend. Type search queries,
review candidates in a filterable table, and export the results to CSV.

Rows whose snippet mentions a money figure (e.g. `$1.2M`, `£500k`) are flagged with
a gold ledger mark — a hint to verify at the source, **not** a claim about anyone's
wealth.

## Run it

You need the NestJS backend running first (default port 3000):

```bash
# in the brave-investor-research project
npm run start:dev
```

Then the frontend:

```bash
npm install
cp .env.example .env      # BACKEND_URL should point at the NestJS app
npm run dev               # http://localhost:3001
```

The frontend talks to the backend through its own `/api/research` route (a
server-side proxy), so the Brave token stays in the backend and there are no CORS
issues.

## How it fits together

```
Browser ──► Next.js /api/research (proxy) ──► NestJS /research/run ──► Brave Search API
   ▲                                                                        │
   └──────────────── rows rendered in the table ◄───────────────────────────┘
```

- **Search** — one query per line; each runs against Brave and results merge (deduped by URL).
- **Filter** — free-text filter, a source dropdown, and an "only money-flagged" toggle.
- **Export CSV** — downloads exactly the rows currently visible (respects your filters).

## Config

| var           | default                 | meaning                          |
| ------------- | ----------------------- | -------------------------------- |
| `BACKEND_URL` | `http://localhost:3000` | where the NestJS backend listens |

## Notes on the data

Same caveats as the backend: search snippets are not financial records. Use the
`Money mentioned` flag as a lead to verify, keep stored data to public/professional
information, and mind UK GDPR when the subjects are identifiable people.

## Contact discovery & outreach (added)

Each result row now has a **Find email** button and a **Draft** button.

- **Find email** calls the backend to read the emails a site *publishes* on its
  page / contact / about (robots.txt respected). Found addresses appear as chips.
  Many of your rows are directory sites, so this often returns the directory's own
  contact rather than an individual investor — open those profile pages manually.
- **Draft** opens a compose modal with a personalized, editable message. Send it two
  ways: **Open in email app** (mailto — sends from your own client) or **Send via
  Brevo** (one recipient, using the backend's verified sender).

This is one-at-a-time, reviewed outreach — not a bulk blaster. Keep stored data to
public professional info, personalize before sending, and mind UK GDPR / PECR /
CAN-SPAM.
