import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { challengesApi } from '@/shared/api';
import { useAuth, getStoredToken } from '@/shared/components/AuthProvider';

export default function ChallengeNew() {
  const navigate = useNavigate();
  const { user, ready } = useAuth();
  const token = getStoredToken();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [rewardPoints, setRewardPoints] = useState(10);
  const [opensAt, setOpensAt] = useState('');
  const [closesAt, setClosesAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const created = await challengesApi.create(token, {
        title: title.trim(),
        description: description.trim(),
        difficulty,
        rewardPoints,
        ...(opensAt.trim() ? { submissionOpensAt: new Date(opensAt).toISOString() } : {}),
        ...(closesAt.trim() ? { submissionClosesAt: new Date(closesAt).toISOString() } : {}),
      });
      const id = (created as { id?: string }).id;
      if (id) navigate(`/challenges/${id}`, { replace: true });
      else navigate('/challenges', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create challenge');
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return <div className="mx-auto max-w-xl px-6 py-16 text-center text-slate-400">Loading…</div>;
  }
  if (!user || !token) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <p className="text-slate-300">Log in to author a challenge.</p>
        <Link to="/login" className="mt-4 inline-block text-brand-400 hover:underline">Go to login</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <Link to="/challenges" className="text-sm text-slate-400 hover:text-brand-400">← Challenges</Link>
      <div className="mt-4 rounded-lg border border-cyan-500/25 bg-slate-950/40 p-1">
        <div className="rounded-md border border-slate-800 bg-surface-900/80 p-6">
          <p className="font-mono text-xs uppercase tracking-widest text-cyan-500/90">{'>'} new_challenge.sh</p>
          <h1 className="mt-2 font-mono text-xl font-semibold text-slate-100">Ship a challenge</h1>
          <p className="mt-2 text-sm text-slate-500">
            Eligible if you&apos;re admin, ranked Junior Dev or higher, or you&apos;ve finished at least three different challenges as a Newbie.
          </p>
          {error && (
            <div className="mt-4 rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block font-mono text-xs text-slate-500">title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input mt-1 w-full font-mono"
                required
                maxLength={200}
              />
            </div>
            <div>
              <label className="block font-mono text-xs text-slate-500">description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input mt-1 min-h-[140px] w-full resize-y font-mono"
                required
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block font-mono text-xs text-slate-500">difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}
                  className="input mt-1 font-mono"
                >
                  <option value="EASY">EASY</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HARD">HARD</option>
                </select>
              </div>
              <div>
                <label className="block font-mono text-xs text-slate-500">reward_points</label>
                <input
                  type="number"
                  min={0}
                  value={rewardPoints}
                  onChange={(e) => setRewardPoints(Number(e.target.value) || 0)}
                  className="input mt-1 w-28 font-mono"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block font-mono text-xs text-slate-500">opens_at (optional)</label>
                <input
                  type="datetime-local"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                  className="input mt-1 w-full font-mono text-sm"
                />
              </div>
              <div>
                <label className="block font-mono text-xs text-slate-500">closes_at (optional)</label>
                <input
                  type="datetime-local"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  className="input mt-1 w-full font-mono text-sm"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary font-mono text-sm" disabled={saving || !title.trim() || !description.trim()}>
              {saving ? '$ compiling…' : '$ publish challenge'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
