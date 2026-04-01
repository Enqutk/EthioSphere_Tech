import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { challengesApi } from '@/lib/api';
import { useAuth, getStoredToken } from '@/components/AuthProvider';

type TimelineMeta = {
  submissionsOpen: boolean;
  submissionsClosed: boolean;
  acceptingSubmissions: boolean;
  hasDeadline: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

type Submission = {
  id: string;
  user: { name: string; username: string };
  points: number;
  solutionUrl?: string | null;
  repoFullName?: string | null;
  repoPublic?: boolean | null;
  submittedAt: string;
};

type Challenge = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  rewardPoints: number;
  active: boolean;
  submissionOpensAt?: string | null;
  submissionClosesAt?: string | null;
  submissions?: Submission[];
  timelineMeta?: TimelineMeta;
};

const DIFF: Record<string, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  if (!d && !h && !m) parts.push(`${sec}s`);
  else if (!d && !h && sec) parts.push(`${sec}s`);
  return parts.join(' ');
}

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token: authToken } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [solutionUrl, setSolutionUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [tick, setTick] = useState(0);

  const token = authToken ?? getStoredToken();

  const loadChallenge = () => {
    if (!id) return;
    challengesApi.get(id, token).then((data) => setChallenge(data as Challenge));
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    challengesApi
      .get(id, token)
      .then((data) => setChallenge(data as Challenge))
      .finally(() => setLoading(false));
  }, [id, user?.id, token]);

  useEffect(() => {
    if (!challenge?.timelineMeta?.hasDeadline) return;
    const t = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => window.clearInterval(t);
  }, [challenge?.timelineMeta?.hasDeadline]);

  const countdownLabel = useMemo(() => {
    if (!challenge?.timelineMeta?.hasDeadline) return null;
    const meta = challenge.timelineMeta;
    const now = Date.now();
    if (!meta.submissionsOpen && meta.opensAt) {
      const open = new Date(meta.opensAt).getTime();
      const left = open - now;
      return left > 0 ? `Submissions open in ${formatDuration(left)}` : null;
    }
    if (!meta.submissionsClosed && meta.closesAt) {
      const close = new Date(meta.closesAt).getTime();
      const left = close - now;
      return left > 0 ? `Time left to submit: ${formatDuration(left)}` : 'Submission period ended';
    }
    if (meta.submissionsClosed) return 'Submission period ended — all solutions are public below.';
    return null;
  }, [challenge, tick]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const t = getStoredToken();
    if (!t || !user) {
      navigate('/login');
      return;
    }
    if (!id) return;
    setSubmitting(true);
    setMessage('');
    try {
      await challengesApi.submit(t, id, { solutionUrl: solutionUrl.trim() || undefined });
      setMessage('Submission recorded! Points will be awarded.');
      const updated = await challengesApi.get(id, t);
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

  const meta = challenge.timelineMeta;
  const hasDeadline = meta?.hasDeadline ?? false;
  const showSubmit =
    user &&
    challenge.active &&
    meta?.acceptingSubmissions &&
    !(challenge.submissions?.some(
      (s) => s.user.username.toLowerCase() === user.username.toLowerCase(),
    ) ?? false);

  const submissionsSectionTitle = hasDeadline
    ? meta?.submissionsClosed
      ? 'Solutions timeline'
      : 'Your submission'
    : 'Top submissions';

  const showSubmissionsEmptyHint =
    hasDeadline && !meta?.submissionsClosed && !user && (challenge.submissions?.length ?? 0) === 0;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/challenges" className="text-sm text-slate-400 hover:text-brand-400">← Back to challenges</Link>
      <div className="card mt-4 p-8">
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs ${
              challenge.difficulty === 'EASY'
                ? 'bg-green-500/20 text-green-400'
                : challenge.difficulty === 'MEDIUM'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
            }`}
          >
            {DIFF[challenge.difficulty] ?? challenge.difficulty}
          </span>
          <span className="rounded bg-brand-500/20 px-2 py-0.5 text-xs text-brand-400">{challenge.rewardPoints} pts</span>
          {!challenge.active && <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-400">Inactive</span>}
          {hasDeadline && (
            <span className="rounded bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">Timed challenge</span>
          )}
        </div>
        <h1 className="mt-4 font-mono text-2xl font-semibold text-slate-100">{challenge.title}</h1>

        {hasDeadline && (
          <div className="mt-4 rounded-lg border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
            {meta?.opensAt && (
              <p className="text-xs text-violet-200/90">
                Opens: {new Date(meta.opensAt).toLocaleString()}
                {meta.closesAt && <> · Closes: {new Date(meta.closesAt).toLocaleString()}</>}
              </p>
            )}
            {!meta?.opensAt && meta?.closesAt && (
              <p className="text-xs text-violet-200/90">Submissions close: {new Date(meta.closesAt).toLocaleString()}</p>
            )}
            {countdownLabel && <p className="mt-2 font-medium text-violet-50">{countdownLabel}</p>}
            {!meta?.submissionsClosed && (
              <p className="mt-2 text-xs text-violet-200/80">
                Until the deadline, only you can see your own submission. After it closes, everyone sees the full timeline in
                order submitted.
              </p>
            )}
          </div>
        )}

        <p className="mt-6 whitespace-pre-wrap text-slate-300">{challenge.description}</p>

        {showSubmit && (
          <div className="mt-8 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">Submit your solution</h2>
            <p className="mt-1 text-xs text-slate-500">
              Paste a <strong className="text-slate-400">public</strong> GitHub repo URL to verify and display, or any other https
              link.
            </p>
            {message && (
              <p className={`mt-2 text-sm ${message.startsWith('Submission') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>
            )}
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              <input
                type="url"
                value={solutionUrl}
                onChange={(e) => setSolutionUrl(e.target.value)}
                placeholder="https://github.com/you/solution-repo or other URL"
                className="input"
              />
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit'}
              </button>
            </form>
          </div>
        )}

        {user && challenge.active && meta && !meta.acceptingSubmissions && meta.hasDeadline && (
          <p className="mt-6 text-sm text-amber-400/90">
            {!meta.submissionsOpen ? 'Submissions are not open yet.' : 'The submission window has closed.'}
          </p>
        )}

        {showSubmissionsEmptyHint && (
          <p className="mt-8 border-t border-slate-700 pt-6 text-sm text-slate-500">
            <Link to="/login" className="text-brand-400 hover:underline">
              Log in
            </Link>{' '}
            to submit. After the deadline, all solutions appear here in a public timeline.
          </p>
        )}

        {challenge.submissions && challenge.submissions.length > 0 && (
          <div className="mt-8 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">{submissionsSectionTitle}</h2>
            {hasDeadline && meta?.submissionsClosed && (
              <p className="mt-1 text-xs text-slate-500">Ordered by submission time (earliest first).</p>
            )}
            <ul className={`mt-4 space-y-0 ${hasDeadline && meta?.submissionsClosed ? 'border-l border-slate-600 pl-4' : ''}`}>
              {challenge.submissions.map((s) => (
                <li
                  key={s.id}
                  className={`relative pb-6 text-sm text-slate-300 ${
                    hasDeadline && meta?.submissionsClosed ? 'before:absolute before:left-[-21px] before:top-1.5 before:h-2 before:w-2 before:rounded-full before:bg-brand-500' : ''
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div>
                      <Link to={`/profile/${s.user.username}`} className="font-medium hover:text-brand-400">
                        @{s.user.username}
                      </Link>
                      <span className="ml-2 text-xs text-slate-500">
                        {new Date(s.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-brand-400">{s.points} pts</span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {s.repoPublic && s.solutionUrl && s.repoFullName ? (
                      <a
                        href={s.solutionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-xs text-brand-400 hover:underline"
                      >
                        {s.repoFullName} ↗
                      </a>
                    ) : s.solutionUrl ? (
                      <a
                        href={s.solutionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-400 hover:text-brand-400"
                      >
                        Solution link ↗
                      </a>
                    ) : (
                      <span className="text-xs text-slate-500">No link</span>
                    )}
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
