'use client';

import { Lead, ContactState } from '@/lib/types';

function MoneyChips({ mentions }: { mentions: string[] }) {
  if (mentions.length === 0) return <span className="money-none">—</span>;
  return (
    <div className="money-chips">
      {mentions.map((m, i) => (
        <span className="money-chip" key={i}>
          {m}
        </span>
      ))}
    </div>
  );
}

/** Emails come from search-time enrichment (lead.emails) or an on-demand lookup. */
function emailsFor(lead: Lead, state?: ContactState): string[] {
  if (lead.emails.length > 0) return lead.emails;
  return state?.emails ?? [];
}

function ContactCell({
  lead,
  state,
  onFind,
  onDraft,
}: {
  lead: Lead;
  state?: ContactState;
  onFind: (lead: Lead) => void;
  onDraft: (lead: Lead, presetEmail?: string) => void;
}) {
  const emails = emailsFor(lead, state);

  if (emails.length > 0) {
    return (
      <div className="contact-cell">
        <div className="email-list">
          {emails.map((e) => (
            <button
              key={e}
              className="email-chip"
              title="Draft an email to this address"
              onClick={() => onDraft(lead, e)}
            >
              {e}
            </button>
          ))}
        </div>
        <button className="btn-sm btn-sm-ghost" onClick={() => onDraft(lead)}>
          Draft manually
        </button>
      </div>
    );
  }

  const status = state?.status ?? 'idle';
  if (status === 'loading') return <span className="contact-status">Checking site…</span>;

  return (
    <div className="contact-cell">
      {status === 'done' && (
        <span className="contact-status">{state?.note ?? 'No published email found.'}</span>
      )}
      <button className="btn-sm btn-sm-ghost" onClick={() => onFind(lead)}>
        Find email
      </button>
      <button className="btn-sm btn-sm-solid" onClick={() => onDraft(lead)}>
        Draft
      </button>
    </div>
  );
}

export default function ResultsTable({
  leads,
  contacts,
  onFind,
  onDraft,
}: {
  leads: Lead[];
  contacts: Record<string, ContactState>;
  onFind: (lead: Lead) => void;
  onDraft: (lead: Lead, presetEmail?: string) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Source</th>
            <th>Money mentioned</th>
            <th>Contact &amp; outreach</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.url} className={lead.inTargetRange ? 'flagged' : undefined}>
              <td>
                <a
                  className="cell-title"
                  href={lead.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {lead.title || lead.url}
                </a>
                {lead.inTargetRange && <span className="range-badge">in target range</span>}
                <span className="cell-desc-inline">{lead.description}</span>
              </td>
              <td>
                <span className="cell-source">{lead.source}</span>
              </td>
              <td>
                <MoneyChips mentions={lead.moneyMentionsInText} />
              </td>
              <td>
                <ContactCell
                  lead={lead}
                  state={contacts[lead.url]}
                  onFind={onFind}
                  onDraft={onDraft}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
