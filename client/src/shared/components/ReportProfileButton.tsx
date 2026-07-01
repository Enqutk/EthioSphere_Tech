import { useState } from 'react';
import { reportsApi } from '@/shared/api';

type Props = {
  token: string;
  targetUsername: string;
  targetType: 'user' | 'company';
};

const REASONS = [
  { value: 'SPAM', label: 'Spam or fake profile' },
  { value: 'FAKE', label: 'Misleading / not a real account' },
  { value: 'HARASSMENT', label: 'Harassment or abuse' },
  { value: 'OTHER', label: 'Other' },
] as const;

export function ReportProfileButton({ token, targetUsername, targetType }: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<(typeof REASONS)[number]['value']>('SPAM');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await reportsApi.submit(token, {
        targetType,
        targetUsername,
        reason,
        ...(details.trim() ? { details: details.trim() } : {}),
      });
      setMessage('Report submitted. Thanks — our team will review it.');
      setDetails('');
      setTimeout(() => setOpen(false), 1500);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not submit report');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" className="btn-secondary text-sm text-red-300/90" onClick={() => setOpen(true)}>
        Report
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal="true">
          <div className="card max-w-md p-6">
            <h2 className="font-mono text-lg text-slate-100">Report @{targetUsername}</h2>
            <p className="mt-1 text-sm text-slate-400">
              Flag spam, fake {targetType === 'company' ? 'companies' : 'accounts'}, or abuse. One report per day per profile.
            </p>
            <form onSubmit={submit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm text-slate-300">Reason</label>
                <select
                  className="input mt-1"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as (typeof REASONS)[number]['value'])}
                >
                  {REASONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-300">Details (optional)</label>
                <textarea
                  className="input mt-1 min-h-[80px]"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  maxLength={1000}
                  placeholder="What looks wrong?"
                />
              </div>
              {message && <p className="text-sm text-brand-400">{message}</p>}
              <div className="flex gap-2">
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Sending…' : 'Submit report'}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
