'use client';

/**
 * page.tsx — the research desk.
 * Flow: write a prompt → POST /api/leads → show the list + offer the CSV the
 * backend generated → click a row's email to open a reviewed outreach draft.
 */

import { useMemo, useState } from 'react';
import { Lead, LeadSearchResponse, ContactState, ContactDiscoveryResult } from '@/lib/types';
import { downloadCsv } from '@/lib/csv';
import ResultsTable from '@/components/ResultsTable';
import ComposeModal, { ComposeTarget } from '@/components/ComposeModal';

// Example prompts reflect the target use case: land investors in a money band.
const EXAMPLES = [
  'land investors london',
  'real estate investors uk 1 million',
  'private land buyers site:crunchbase.com',
  'property investment firms london seed',
];

/** Pull a plausible name/firm from a result title for personalization. */
function deriveName(title: string): string {
  const first = title.split(/[—|]|,| - /)[0]?.trim();
  return first && first.length <= 60 ? first : title.trim();
}

function buildDraft(lead: Lead, to = ''): ComposeTarget {
  const name = deriveName(lead.title);
  const subject = `Intro — [your company] x ${name}`;
  const body = [
    `Hi ${name},`,
    ``,
    `I came across your profile via ${lead.source} while researching land/real-estate investors active in [area].`,
    ``,
    `I'm [your company] — [one line on what you do / the opportunity and why it fits their focus].`,
    ``,
    `Would you be open to a short call in the next couple of weeks? Happy to share details first.`,
    ``,
    `Best,`,
    `[Your Name]`,
  ].join('\n');
  return { to, toName: name, subject, body };
}

export default function Home() {
  const [queryText, setQueryText] = useState('');
  const [enrich, setEnrich] = useState(false);
  const [minM, setMinM] = useState(1.0); // millions
  const [maxM, setMaxM] = useState(1.5);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [serverFile, setServerFile] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const [filter, setFilter] = useState('');
  const [onlyInRange, setOnlyInRange] = useState(false);
  const [source, setSource] = useState('all');

  const [contacts, setContacts] = useState<Record<string, ContactState>>({});
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null);

  const sources = useMemo(() => {
    const set = new Set(leads.map((l) => l.source).filter(Boolean));
    return ['all', ...[...set].sort()];
  }, [leads]);

  const visible = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return leads.filter((l) => {
      if (onlyInRange && !l.inTargetRange) return false;
      if (source !== 'all' && l.source !== source) return false;
      if (needle) {
        const hay = `${l.title} ${l.description} ${l.source} ${l.emails.join(' ')}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [leads, filter, onlyInRange, source]);

  const inRangeCount = useMemo(() => leads.filter((l) => l.inTargetRange).length, [leads]);
  const withEmailCount = useMemo(() => leads.filter((l) => l.emails.length > 0).length, [leads]);

  async function runSearch() {
    const queries = queryText
      .split('\n')
      .map((q) => q.trim())
      .filter(Boolean);
    if (queries.length === 0) {
      setError('Enter at least one search prompt (one per line).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queries,
          enrich,
          target: { min: Math.round(minM * 1_000_000), max: Math.round(maxM * 1_000_000) },
          export: true,
        }),
      });
      const data: LeadSearchResponse = await res.json();
      if (!res.ok || data.error) {
        setError(data.error ?? `Request failed (${res.status}).`);
        setLeads([]);
        setServerFile(null);
      } else {
        setLeads(data.leads ?? []);
        setServerFile(data.file);
        setContacts({});
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      setError(`Network error reaching /api/leads (${detail}). Is the frontend able to reach its API route?`);
    } finally {
      setLoading(false);
      setHasRun(true);
    }
  }

  async function findEmail(lead: Lead) {
    setContacts((c) => ({ ...c, [lead.url]: { status: 'loading', emails: [] } }));
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: lead.url }),
      });
      const data: ContactDiscoveryResult = await res.json();
      setContacts((c) => ({
        ...c,
        [lead.url]: {
          status: 'done',
          emails: (data.emails ?? []).map((e) => e.address),
          note: data.note ?? data.error,
        },
      }));
    } catch {
      setContacts((c) => ({ ...c, [lead.url]: { status: 'error', emails: [], note: 'Lookup failed.' } }));
    }
  }

  function draft(lead: Lead, presetEmail?: string) {
    setComposeTarget(buildDraft(lead, presetEmail ?? ''));
  }

  function addExample(ex: string) {
    setQueryText((prev) => (prev.trim() ? `${prev.trim()}\n${ex}` : ex));
  }

  return (
    <main className="page">
      <section className="panel">
        <div className="panel-head">
          <span className="panel-title">Search prompt</span>
          <span className="panel-hint">One prompt per line</span>
        </div>

        <textarea
          className="query-input"
          placeholder={'land investors london\nreal estate investors uk 1 million'}
          value={queryText}
          onChange={(e) => setQueryText(e.target.value)}
        />

        <div className="examples">
          {EXAMPLES.map((ex) => (
            <button type="button" className="chip" key={ex} onClick={() => addExample(ex)}>
              + {ex}
            </button>
          ))}
        </div>

        <div className="run-options">
          {/* <label className="toggle">
            <input type="checkbox" checked={enrich} onChange={(e) => setEnrich(e.target.checked)} />
            Find published emails while searching (slower)
          </label> */}
          <div className="range-input">
            <span className="range-label">Target band ($M)</span>
            <input
              className="num"
              type="number"
              step="0.1"
              value={minM}
              onChange={(e) => setMinM(parseFloat(e.target.value) || 0)}
            />
            <span className="range-dash">–</span>
            <input
              className="num"
              type="number"
              step="0.1"
              value={maxM}
              onChange={(e) => setMaxM(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="actions">
          <button className="btn btn-primary" onClick={runSearch} disabled={loading}>
            {loading ? 'Searching…' : 'Run search'}
          </button>
          <button
            className="btn btn-ghost"
            onClick={() => downloadCsv(visible, 'leads.csv')}
            disabled={visible.length === 0}
          >
            Export CSV ({visible.length})
          </button>
          {serverFile && (
            <a className="btn btn-ghost" href={`/api/leads/download?file=${encodeURIComponent(serverFile)}`}>
              Download server CSV
            </a>
          )}
        </div>

        {error && <div className="notice notice-error">{error}</div>}

        <p className="disclaimer">
          <strong>inTargetRange</strong> flags rows whose text mentions a figure in your band — a hint
          to verify, not a person&apos;s verified equity. <strong>Find email</strong> reads only what a
          site publishes (robots.txt respected); it never guesses personal addresses. Keep stored data
          to public professional info and mind UK GDPR / PECR / CAN-SPAM. Each send goes to one
          recipient after you review it.
        </p>
      </section>

      {loading && <div className="loading-row" />}

      {hasRun && leads.length > 0 && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="stat-num">{leads.length}</div>
              <div className="stat-label">Candidates</div>
            </div>
            <div className="stat">
              <div className="stat-num gold">{inRangeCount}</div>
              <div className="stat-label">In target range</div>
            </div>
            <div className="stat">
              <div className="stat-num">{withEmailCount}</div>
              <div className="stat-label">With email</div>
            </div>
          </div>

          <div className="controls">
            <input
              className="filter"
              placeholder="Filter by title, snippet, source, email…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <select className="select" value={source} onChange={(e) => setSource(e.target.value)}>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s === 'all' ? 'All sources' : s}
                </option>
              ))}
            </select>
            <label className="toggle">
              <input
                type="checkbox"
                checked={onlyInRange}
                onChange={(e) => setOnlyInRange(e.target.checked)}
              />
              Only in target range
            </label>
          </div>

          <ResultsTable leads={visible} contacts={contacts} onFind={findEmail} onDraft={draft} />
        </>
      )}

      {hasRun && !loading && leads.length === 0 && !error && (
        <div className="empty">
          <h2>No candidates found</h2>
          <p>Try broader terms, or target a source directly with a site: query.</p>
        </div>
      )}

      {!hasRun && !loading && (
        <div className="empty">
          <h2>Start with a prompt</h2>
          <p>
            Describe the investors you&apos;re after. Results — with a CSV and per-row outreach — land
            here.
          </p>
        </div>
      )}

      {composeTarget && (
        <ComposeModal target={composeTarget} onClose={() => setComposeTarget(null)} />
      )}
    </main>
  );
}
