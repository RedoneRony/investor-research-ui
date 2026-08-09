'use client';

import { useState } from 'react';

export interface ComposeTarget {
  to: string;
  toName: string;
  subject: string;
  body: string;
}

const COMPLIANCE_HINT =
  'Reviewed and personalized? Cold outreach must identify you and offer an opt-out. A footer with your name, postal address, and an opt-out line is added automatically.';

export default function ComposeModal({
  target,
  onClose,
}: {
  target: ComposeTarget;
  onClose: () => void;
}) {
  const [to, setTo] = useState(target.to);
  const [subject, setSubject] = useState(target.subject);
  const [body, setBody] = useState(target.body);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  function openInMailApp() {
    const footer = [
      '',
      '',
      '—',
      'Sent by [Your Name], [Your Company], [Postal Address].',
      'If you\'d rather not hear from me, reply "unsubscribe" and I won\'t contact you again.',
    ].join('\n');
    const href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body + footer)}`;
    window.location.href = href;
  }

  async function sendViaBrevo() {
    if (!to.trim()) {
      setStatus('error');
      setMessage('Add a recipient email first.');
      return;
    }
    setStatus('sending');
    setMessage('');
    try {
      const res = await fetch('/api/outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, toName: target.toName, subject, body }),
      });
      const data = await res.json();
      if (data.ok) {
        setStatus('sent');
        setMessage('Sent.');
      } else {
        setStatus('error');
        setMessage(data.error ?? 'Send failed.');
      }
    } catch {
      setStatus('error');
      setMessage('Network error.');
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {/* Fixed header */}
        <div className="modal-head">
          <span className="modal-title">Draft outreach</span>
          <button className="modal-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {/* Scrollable middle — grows/shrinks to fit the viewport */}
        <div className="modal-body">
          <label className="field-label">To</label>
          <input
            className="field"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="investor@fund.com"
          />

          <label className="field-label">Subject</label>
          <input
            className="field"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <label className="field-label">Message</label>
          <textarea
            className="field field-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          <p className="modal-hint">{COMPLIANCE_HINT}</p>

          {message && (
            <div className={status === 'sent' ? 'notice notice-ok' : 'notice notice-error'}>
              {message}
            </div>
          )}
        </div>

        {/* Pinned footer — send buttons are always reachable */}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={openInMailApp}>
            Open in email app
          </button>
          <button
            className="btn btn-primary"
            onClick={sendViaBrevo}
            disabled={status === 'sending' || status === 'sent'}
          >
            {status === 'sending' ? 'Sending…' : status === 'sent' ? 'Sent ✓' : 'Send via Brevo'}
          </button>
        </div>
      </div>
    </div>
  );
}
