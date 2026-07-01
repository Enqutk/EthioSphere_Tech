import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { challengesApi, type ChallengeCreatedBy } from '@/shared/api/challenges';
import { useAuth, getStoredToken } from '@/shared/components/AuthProvider';

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
  solutionText?: string | null;
  solutionLanguage?: string | null;
  repoFullName?: string | null;
  repoPublic?: boolean | null;
  submittedAt: string;
  likeCount?: number;
  commentCount?: number;
  likedByViewer?: boolean;
};

type Challenge = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  rewardPoints: number;
  active: boolean;
  submissionMode?: 'GITHUB' | 'CODE';
  requiredLanguages?: string[];
  createdBy?: ChallengeCreatedBy | null;
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

function SubmissionCard({
  challengeId,
  submission,
  token,
  onLikeUpdate,
  onCommentAdded,
}: {
  challengeId: string;
  submission: Submission;
  token: string | null;
  onLikeUpdate: (submissionId: string, liked: boolean, likeCount: number) => void;
  onCommentAdded: (submissionId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<
    { id: string; body: string; createdAt: string; user: { username: string; name: string } }[]
  >([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentBusy, setCommentBusy] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const list = await challengesApi.listSubmissionComments(challengeId, submission.id, token);
      setComments(list);
    } finally {
      setLoadingComments(false);
    }
  }, [challengeId, submission.id, token]);

  useEffect(() => {
    if (expanded && comments.length === 0 && !loadingComments) loadComments();
  }, [expanded, comments.length, loadingComments, loadComments]);

  async function handleLike() {
    if (!token || likeBusy) return;
    setLikeBusy(true);
    try {
      const r = await challengesApi.likeSubmission(token, challengeId, submission.id);
      onLikeUpdate(submission.id, r.liked, r.likeCount);
    } finally {
      setLikeBusy(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !commentText.trim()) return;
    setCommentBusy(true);
    try {
      await challengesApi.addSubmissionComment(token, challengeId, submission.id, commentText.trim());
      setCommentText('');
      await loadComments();
      onCommentAdded(submission.id);
    } finally {
      setCommentBusy(false);
    }
  }

  return (
    <li className="rounded-lg border border-slate-800 bg-surface-900/40 p-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Link to={`/profile/${submission.user.username}`} className="font-medium text-slate-200 hover:text-brand-400">
            @{submission.user.username}
          </Link>
          <span className="ml-2 text-xs text-slate-500">{new Date(submission.submittedAt).toLocaleString()}</span>
          {submission.solutionLanguage && (
            <span className="ml-2 rounded bg-surface-800 px-1.5 py-0.5 text-xs text-slate-400">{submission.solutionLanguage}</span>
          )}
        </div>
        <span className="text-brand-400">{submission.points} pts</span>
      </div>

      <div className="mt-2">
        {submission.solutionText ? (
          <pre className="max-h-48 overflow-auto rounded-lg border border-slate-800 bg-surface-950 p-3 font-mono text-xs text-slate-300 whitespace-pre-wrap">
            {submission.solutionText}
          </pre>
        ) : submission.repoPublic && submission.solutionUrl && submission.repoFullName ? (
          <a href={submission.solutionUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-brand-400 hover:underline">
            {submission.repoFullName} ↗
          </a>
        ) : submission.solutionUrl ? (
          <a href={submission.solutionUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-400 hover:text-brand-400">
            Solution link ↗
          </a>
        ) : (
          <span className="text-xs text-slate-500">No link</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-800 pt-3">
        <button
          type="button"
          disabled={!token || likeBusy}
          onClick={handleLike}
          className={`text-xs ${submission.likedByViewer ? 'text-brand-400' : 'text-slate-400 hover:text-brand-400'}`}
        >
          {submission.likedByViewer ? '♥' : '♡'} {submission.likeCount ?? 0} likes
        </button>
        <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs text-slate-400 hover:text-brand-400">
          {expanded ? 'Hide' : 'Show'} comments ({submission.commentCount ?? comments.length})
        </button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
          {loadingComments ? (
            <p className="text-xs text-slate-500">Loading comments…</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-slate-500">No comments yet.</p>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="rounded border border-slate-800/80 bg-surface-950/60 px-3 py-2 text-xs">
                  <span className="font-medium text-slate-300">@{c.user.username}</span>
                  <span className="ml-2 text-slate-600">{new Date(c.createdAt).toLocaleString()}</span>
                  <p className="mt-1 whitespace-pre-wrap text-slate-400">{c.body}</p>
                </li>
              ))}
            </ul>
          )}
          {token ? (
            <form onSubmit={handleComment} className="flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="input flex-1 text-xs"
                placeholder="Add feedback or ask a question…"
                maxLength={2000}
              />
              <button type="submit" className="btn-secondary text-xs shrink-0" disabled={commentBusy || !commentText.trim()}>
                Post
              </button>
            </form>
          ) : (
            <p className="text-xs text-slate-500">
              <Link to="/login" className="text-brand-400 hover:underline">Log in</Link> to comment.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

export default function ChallengeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, token: authToken } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [solutionUrl, setSolutionUrl] = useState('');
  const [solutionText, setSolutionText] = useState('');
  const [solutionLanguage, setSolutionLanguage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [tick, setTick] = useState(0);

  const token = authToken ?? getStoredToken();
  const isGithubMode = (challenge?.submissionMode ?? 'GITHUB') === 'GITHUB';

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
      const left = new Date(meta.opensAt).getTime() - now;
      return left > 0 ? `Submissions open in ${formatDuration(left)}` : null;
    }
    if (!meta.submissionsClosed && meta.closesAt) {
      const left = new Date(meta.closesAt).getTime() - now;
      return left > 0 ? `Time left to submit: ${formatDuration(left)}` : 'Submission period ended';
    }
    if (meta.submissionsClosed) return 'Submission period ended — all solutions are public below.';
    return null;
  }, [challenge, tick]);

  function updateSubmissionLike(submissionId: string, liked: boolean, likeCount: number) {
    setChallenge((prev) => {
      if (!prev?.submissions) return prev;
      return {
        ...prev,
        submissions: prev.submissions.map((s) =>
          s.id === submissionId ? { ...s, likedByViewer: liked, likeCount } : s,
        ),
      };
    });
  }

  function incrementCommentCount(submissionId: string) {
    setChallenge((prev) => {
      if (!prev?.submissions) return prev;
      return {
        ...prev,
        submissions: prev.submissions.map((s) =>
          s.id === submissionId ? { ...s, commentCount: (s.commentCount ?? 0) + 1 } : s,
        ),
      };
    });
  }

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
      await challengesApi.submit(t, id, {
        ...(isGithubMode
          ? { solutionUrl: solutionUrl.trim() }
          : { solutionText: solutionText.trim(), solutionLanguage: solutionLanguage.trim() || undefined }),
      });
      setMessage('Submission recorded!');
      const updated = await challengesApi.get(id, t);
      setChallenge(updated as Challenge);
      setSolutionUrl('');
      setSolutionText('');
      setSolutionLanguage('');
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
    !(challenge.submissions?.some((s) => s.user.username.toLowerCase() === user.username.toLowerCase()) ?? false);

  const submissionsSectionTitle = hasDeadline
    ? meta?.submissionsClosed
      ? 'Solutions timeline'
      : 'Your submission'
    : 'Solutions';

  const companyAuthor =
    challenge.createdBy?.accountType === 'COMPANY' ? challenge.createdBy.company?.legalName : null;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/challenges" className="text-sm text-slate-400 hover:text-brand-400">← Back to challenges</Link>
      <div className="card mt-4 p-8">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded px-2 py-0.5 text-xs ${challenge.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' : challenge.difficulty === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
            {DIFF[challenge.difficulty] ?? challenge.difficulty}
          </span>
          <span className="rounded bg-brand-500/20 px-2 py-0.5 text-xs text-brand-400">{challenge.rewardPoints} pts</span>
          <span className="rounded bg-surface-800 px-2 py-0.5 text-xs text-slate-400">
            {isGithubMode ? 'GitHub submission' : 'Inline code'}
          </span>
          {companyAuthor && (
            <span className="rounded bg-violet-500/15 px-2 py-0.5 text-xs text-violet-300">By {companyAuthor}</span>
          )}
          {!challenge.active && <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-400">Inactive</span>}
          {hasDeadline && <span className="rounded bg-violet-500/20 px-2 py-0.5 text-xs text-violet-300">Timed challenge</span>}
        </div>

        {challenge.createdBy && (
          <p className="mt-3 text-xs text-slate-500">
            Posted by{' '}
            <Link to={`/profile/${challenge.createdBy.username}`} className="text-brand-400 hover:underline">
              @{challenge.createdBy.username}
            </Link>
          </p>
        )}

        <h1 className="mt-2 font-mono text-2xl font-semibold text-slate-100">{challenge.title}</h1>

        {challenge.requiredLanguages && challenge.requiredLanguages.length > 0 && (
          <p className="mt-3 text-sm text-slate-400">
            Required language{challenge.requiredLanguages.length > 1 ? 's' : ''}:{' '}
            {challenge.requiredLanguages.map((lang) => (
              <span key={lang} className="mr-1 inline-block rounded bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">
                {lang}
              </span>
            ))}
          </p>
        )}

        {hasDeadline && meta && (
          <div className="mt-4 rounded-lg border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-100">
            {meta.opensAt && (
              <p className="text-xs text-violet-200/90">
                Opens: {new Date(meta.opensAt).toLocaleString()}
                {meta.closesAt && <> · Closes: {new Date(meta.closesAt).toLocaleString()}</>}
              </p>
            )}
            {!meta.opensAt && meta.closesAt && (
              <p className="text-xs text-violet-200/90">Submissions close: {new Date(meta.closesAt).toLocaleString()}</p>
            )}
            {countdownLabel && <p className="mt-2 font-medium text-violet-50">{countdownLabel}</p>}
          </div>
        )}

        <p className="mt-6 whitespace-pre-wrap text-slate-300">{challenge.description}</p>

        {showSubmit && (
          <div className="mt-8 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">Submit your solution</h2>
            {isGithubMode ? (
              <p className="mt-1 text-xs text-slate-500">
                Push your solution to a <strong className="text-slate-400">public</strong> GitHub repository and paste the URL below.
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">Paste your code below. Everyone can view, like, and comment after you submit.</p>
            )}
            {message && (
              <p className={`mt-2 text-sm ${message.startsWith('Submission recorded') ? 'text-green-400' : 'text-red-400'}`}>{message}</p>
            )}
            <form onSubmit={handleSubmit} className="mt-3 space-y-3">
              {isGithubMode ? (
                <input
                  type="url"
                  value={solutionUrl}
                  onChange={(e) => setSolutionUrl(e.target.value)}
                  placeholder="https://github.com/you/solution-repo"
                  className="input"
                  required
                />
              ) : (
                <>
                  {challenge.requiredLanguages && challenge.requiredLanguages.length > 0 && (
                    <select
                      value={solutionLanguage}
                      onChange={(e) => setSolutionLanguage(e.target.value)}
                      className="input w-full max-w-xs"
                      required
                    >
                      <option value="">Select language…</option>
                      {challenge.requiredLanguages.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </select>
                  )}
                  {!challenge.requiredLanguages?.length && (
                    <input
                      value={solutionLanguage}
                      onChange={(e) => setSolutionLanguage(e.target.value)}
                      placeholder="Language (optional, e.g. Python)"
                      className="input max-w-xs"
                    />
                  )}
                  <textarea
                    value={solutionText}
                    onChange={(e) => setSolutionText(e.target.value)}
                    placeholder="Your solution code…"
                    className="input min-h-[160px] font-mono text-sm"
                    required
                    maxLength={10000}
                  />
                </>
              )}
              <button type="submit" className="btn-primary" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit solution'}
              </button>
            </form>
          </div>
        )}

        {challenge.submissions && challenge.submissions.length > 0 && (
          <div className="mt-8 border-t border-slate-700 pt-6">
            <h2 className="font-mono text-sm font-medium text-slate-400">{submissionsSectionTitle}</h2>
            <p className="mt-1 text-xs text-slate-500">Like and comment on solutions. Learn from how others approached the problem.</p>
            <ul className="mt-4 space-y-3">
              {challenge.submissions.map((s) => (
                <SubmissionCard
                  key={s.id}
                  challengeId={challenge.id}
                  submission={s}
                  token={token}
                  onLikeUpdate={updateSubmissionLike}
                  onCommentAdded={incrementCommentCount}
                />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
