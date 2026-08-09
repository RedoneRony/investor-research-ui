/**
 * csv.ts — client-side CSV export of the currently visible leads. Mirrors the
 * backend's column order so a browser-exported file matches the server file.
 */
import { Lead } from './types';

const COLUMNS: (keyof Lead | 'emailsJoined' | 'moneyJoined')[] = [
  'query',
  'title',
  'url',
  'source',
  'emailsJoined',
  'moneyJoined',
  'maxMoneyValue',
  'inTargetRange',
  'description',
  'fetchedAt',
];

function escape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function cell(lead: Lead, col: string): unknown {
  switch (col) {
    case 'emailsJoined':
      return lead.emails.join(' | ');
    case 'moneyJoined':
      return lead.moneyMentionsInText.join(' | ');
    case 'inTargetRange':
      return lead.inTargetRange ? 'yes' : 'no';
    case 'maxMoneyValue':
      return lead.maxMoneyValue ?? '';
    default:
      return (lead as unknown as Record<string, unknown>)[col];
  }
}

export function toCsv(leads: Lead[]): string {
  const header = COLUMNS.map((c) =>
    c === 'emailsJoined' ? 'emails' : c === 'moneyJoined' ? 'moneyMentionsInText' : c,
  ).join(',');
  const body = leads
    .map((lead) => COLUMNS.map((col) => escape(cell(lead, col))).join(','))
    .join('\n');
  return `${header}\n${body}\n`;
}

export function downloadCsv(leads: Lead[], filename = 'leads.csv'): void {
  const blob = new Blob([toCsv(leads)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
