import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { challengesApi } from '@/lib/api';

type Challenge = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  rewardPoints: number;
  active: boolean;
};

const DIFF: Record<string, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

export default function Challenges() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    challengesApi.list().then((data) => setChallenges(data as Challenge[])).finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="font-mono text-2xl font-semibold text-slate-100">Coding Challenges</h1>
      <p className="mt-2 text-slate-400">Solve challenges, earn points, climb the leaderboard.</p>
      {loading ? (
        <div className="mt-12 text-center text-slate-400">Loading challenges…</div>
      ) : challenges.length === 0 ? (
        <div className="mt-12 rounded-xl border border-dashed border-slate-700 p-12 text-center text-slate-500">No challenges yet. Check back soon.</div>
      ) : (
        <ul className="mt-8 space-y-4">
          {challenges.map((c) => (
            <li key={c.id}>
              <Link to={`/challenges/${c.id}`} className="card block p-6 transition hover:border-brand-500/50">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-mono font-semibold text-slate-100">{c.title}</h2>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">{c.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`rounded px-2 py-0.5 text-xs ${c.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' : c.difficulty === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{DIFF[c.difficulty] ?? c.difficulty}</span>
                      <span className="rounded bg-brand-500/20 px-2 py-0.5 text-xs text-brand-400">{c.rewardPoints} pts</span>
                      {!c.active && <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-400">Inactive</span>}
                    </div>
                  </div>
                  <span className="text-slate-500">→</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
