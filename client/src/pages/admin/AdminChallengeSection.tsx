import type { ChallengeRow } from './types';

type Props = {
  chTitle: string;
  chDesc: string;
  chDiff: 'EASY' | 'MEDIUM' | 'HARD';
  chPts: number;
  chOpensAt: string;
  chClosesAt: string;
  chSaving: boolean;
  challenges: ChallengeRow[];
  onTitleChange: (value: string) => void;
  onDescChange: (value: string) => void;
  onDiffChange: (value: 'EASY' | 'MEDIUM' | 'HARD') => void;
  onPtsChange: (value: number) => void;
  onOpensAtChange: (value: string) => void;
  onClosesAtChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onDeleteChallenge: (id: string, title: string) => void;
};

export function AdminChallengeSection({
  chTitle,
  chDesc,
  chDiff,
  chPts,
  chOpensAt,
  chClosesAt,
  chSaving,
  challenges,
  onTitleChange,
  onDescChange,
  onDiffChange,
  onPtsChange,
  onOpensAtChange,
  onClosesAtChange,
  onSubmit,
  onDeleteChallenge,
}: Props) {
  return (
    <>
      <section className="mt-12">
        <h2 className="font-mono text-lg text-slate-200">Create challenge</h2>
        <form onSubmit={onSubmit} className="card mt-4 space-y-4 p-6">
          <div>
            <label className="block text-sm text-slate-300">Title</label>
            <input value={chTitle} onChange={(e) => onTitleChange(e.target.value)} className="input mt-1" required />
          </div>
          <div>
            <label className="block text-sm text-slate-300">Description</label>
            <textarea value={chDesc} onChange={(e) => onDescChange(e.target.value)} className="input mt-1 min-h-[100px]" required />
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm text-slate-300">Difficulty</label>
              <select value={chDiff} onChange={(e) => onDiffChange(e.target.value as typeof chDiff)} className="input mt-1">
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-300">Points</label>
              <input
                type="number"
                min={0}
                value={chPts}
                onChange={(e) => onPtsChange(Number(e.target.value))}
                className="input mt-1 w-28"
              />
            </div>
          </div>
          <div className="rounded-lg border border-slate-700 bg-surface-950/50 p-4">
            <p className="text-sm font-medium text-slate-300">Submission window (optional)</p>
            <p className="mt-1 text-xs text-slate-500">
              If you set a <strong className="text-slate-400">close</strong> time, other people&apos;s solutions stay hidden until
              then; after it passes, everyone sees a public timeline (GitHub links and order of submission).
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-400">Opens at (local)</label>
                <input type="datetime-local" value={chOpensAt} onChange={(e) => onOpensAtChange(e.target.value)} className="input mt-1 w-full" />
              </div>
              <div>
                <label className="block text-xs text-slate-400">Closes at (local)</label>
                <input type="datetime-local" value={chClosesAt} onChange={(e) => onClosesAtChange(e.target.value)} className="input mt-1 w-full" />
              </div>
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={chSaving}>
            {chSaving ? 'Creating…' : 'Create challenge'}
          </button>
        </form>
      </section>

      <section className="mt-12">
        <h2 className="font-mono text-lg text-slate-200">Challenges</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="border-b border-slate-800 bg-surface-900/80 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Difficulty</th>
                <th className="px-4 py-3">Pts</th>
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {challenges.map((c) => (
                <tr key={c.id} className="border-b border-slate-800/80">
                  <td className="px-4 py-3 font-mono text-slate-200">
                    {c.title}
                    {c.submissionClosesAt && (
                      <span className="mt-1 block text-xs font-normal text-violet-400">
                        Closes {new Date(c.submissionClosesAt).toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">{c.difficulty}</td>
                  <td className="px-4 py-3">{c.rewardPoints}</td>
                  <td className="px-4 py-3">
                    <button type="button" className="text-xs text-red-400 hover:underline" onClick={() => onDeleteChallenge(c.id, c.title)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
