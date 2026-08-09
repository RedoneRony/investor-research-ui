/**
 * types.ts — shapes shared across the UI, mirroring the backend's Lead model.
 */

/** One enriched candidate from the leads pipeline. */
export interface Lead {
  query: string;
  title: string;
  url: string;
  source: string;
  description: string;
  emails: string[]; // published/org emails found during enrichment (may be empty)
  moneyMentionsInText: string[]; // money figures the page mentions (hints only)
  maxMoneyValue: number | null;
  inTargetRange: boolean; // a mention fell in the target band — verify at source
  fetchedAt: string;
}

export interface TargetRange {
  min: number;
  max: number;
}

export interface LeadSearchResponse {
  leads: Lead[];
  count: number;
  file: string | null; // server CSV filename, for the download link
  target: TargetRange;
  error?: string;
}

export interface DiscoveredEmail {
  address: string;
  foundOn: string;
}

export interface ContactDiscoveryResult {
  url: string;
  emails: DiscoveredEmail[];
  checkedPages: string[];
  skipped: string[];
  note?: string;
  error?: string;
}

/** Per-row on-demand contact lookup state (for rows not enriched at search time). */
export interface ContactState {
  status: 'idle' | 'loading' | 'done' | 'error';
  emails: string[];
  note?: string;
}
