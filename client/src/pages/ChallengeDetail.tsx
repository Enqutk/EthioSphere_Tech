import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { challengesApi } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { getStoredToken } from '@/components/AuthProvider';

type Challenge = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  rewardPoints: number;
  active: boolean;
  submissions?: {
    id: string;
    user: { name: string; username: string };
    points: number;
    solutionUrl?: string | null;
    repoFullName?: string | null;
    repoPublic?: boolean | null;
  }[];
};

const DIFF: Record<string, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [solutionUrl, setSolutionUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    challengesApi.get(id).then((data) => setChallenge(data as Challenge)).finally(() => setLoading(false));
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredToken();
    if (!token || !user) {
      navigate('/login');
      return;
    }
    if (!id) return;
    setSubmitting(true);
    setMessage('');
    try {
      await challengesApi.submit(token, id, { solutionUrl: solutionUrl.trim() || undefined });
      setMessage('Submission recorded! Points will be awarded.');
      const updated = await challengesApi.get(id);
      setChallenge(updated as Challenge);
      setSolutionUrl('');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-slate-400">Loading…</div>;
  if (!challenge) return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-red-400">Challenge not found</div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/challenges" className="text-sm text-slate-400 hover:text-brand-400">← Back to challenges</Link>
      <div className="card mt-4 p-8">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded px-2 py-0.5 text-xs ${challenge.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' : challenge.difficulty === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{DIFF[challenge.difficulty] ?? challenge.difficulty}</span>
          <span className="rounded bg-brand-500/20 px-2 py-0.5 text-xs text-brand-400">{challenge.rewardPoints} pts</span>
          {!challenge.active && <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-400">Inactive</span>}
        </div>
        <h1 className="mt-4 font-mono text-2xl font-semibold text-slate-100">{challenge.title}</h1>
        <p className="mt-6 whitespace-pre-wrap text-slate-300">{challenge.description}</p>
        {user && challenge.active && (
          <div className="mt-8 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">Submit your solution</h2>
            <p className="mt-1 text-xs text-slate-500">
              Paste a <strong className="text-slate-400">public</strong> GitHub repo URL to show it on the leaderboard, or any other https link.
            </p>
            {message && <p className={`mt-2 text-sm ${message.startsWith('Submission') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>}
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <input type="url" value={solutionUrl} onChange={(e) => setSolutionUrl(e.target.value)} placeholder="https://github.com/you/solution-repo or other URL" className="input" />
              <button type="submit" className="btn-primary" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit'}</button>
            </form>
          </div>
        )}
        {challenge.submissions && challenge.submissions.length > 0 && (
          <div className="mt-8 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">Top submissions</h2>
            <ul className="mt-2 space-y-3">
              {challenge.submissions.slice(0, 10).map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
                  <Link to={`/profile/${s.user.username}`} className="hover:text-brand-400">@{s.user.username}</Link>
                  <div className="flex flex-wrap items-center gap-2">
                    {s.repoPublic && s.solutionUrl && s.repoFullName ? (
                      <a href={s.solutionUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-brand-400 hover:underline">
                        {s.repoFullName}
                      </a>
                    ) : s.solutionUrl ? (
                      <a href={s.solutionUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-brand-400">
                        link
                      </a>
                    ) : null}
                    <span className="text-brand-400">{s.points} pts</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
