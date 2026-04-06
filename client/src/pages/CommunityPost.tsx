import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { adminApi, postsApi } from '@/shared/api';
import { useAuth, getStoredToken } from '@/shared/components/AuthProvider';
import { FollowCreatorActions } from '@/shared/components/FollowCreatorActions';
import { PulseStrip } from '@/shared/components/PulseStrip';

type Post = {
  id: string;
  title: string;
  body: string;
  section: string;
  solved: boolean;
  repoUrl?: string | null;
  repoFullName?: string | null;
  repoPublic?: boolean | null;
  repoDescription?: string | null;
  project?: { id: string; title: string; githubFullName?: string | null } | null;
  author: { id: string; name: string; username: string; avatarUrl?: string | null };
  comments: { id: string; body: string; isSolution: boolean; author: { id: string; name: string; username: string }; createdAt: string }[];
  viewCount?: number;
  pulseScore?: number;
  upvotes?: number;
  downvotes?: number;
  commentCount?: number;
  viewerVote?: 'up' | 'down' | null;
};

const SECTIONS: Record<string, string> = {
  GENERAL: 'General', DEBUG_HELP: 'Debug help', PROJECT_FEEDBACK: 'Project feedback', ANNOUNCEMENTS: 'Announcements',
  REACT: 'React', NODE: 'Node', PYTHON: 'Python', OTHER: 'Other',
};

export default function CommunityPost() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [voteBusy, setVoteBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    const token = getStoredToken();
    postsApi.get(id, token).then((data) => setPost(data as Post)).finally(() => setLoading(false));
  }, [id]);

  async function handleVote(upvote: boolean) {
    const token = getStoredToken();
    if (!token || !user || !id || voteBusy) return;
    setVoteBusy(true);
    try {
      const r = await postsApi.vote(token, id, upvote);
      setPost((p) =>
        p
          ? {
              ...p,
              upvotes: r.upvotes,
              downvotes: r.downvotes,
              pulseScore: r.pulseScore,
              viewerVote: r.viewerVote,
            }
          : p,
      );
    } finally {
      setVoteBusy(false);
    }
  }

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    const token = getStoredToken();
    if (!token || !user || !comment.trim() || !id) return;
    setSubmitting(true);
    try {
      await postsApi.addComment(token, id, { body: comment.trim() });
      const updated = await postsApi.get(id, token);
      setPost(updated as Post);
      setComment('');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdminDeletePost() {
    const token = getStoredToken();
    if (!token || !id || !user?.isAdmin) return;
    if (!confirm('Delete this post for everyone?')) return;
    try {
      await adminApi.deletePost(token, id);
      navigate('/community', { replace: true });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not delete');
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-slate-400">Loading…</div>;
  if (!post) return <div className="mx-auto max-w-3xl px-6 py-16 text-center text-red-400">Post not found</div>;

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <Link to="/community" className="text-sm text-slate-400 hover:text-brand-400">← Back to community</Link>
      <div className="card mt-4 p-8">
        <span className="text-xs text-slate-500">{SECTIONS[post.section] ?? post.section}</span>
        <h1 className="mt-2 font-mono text-2xl font-semibold text-slate-100">{post.title}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-400">
          <Link to={`/profile/${post.author.username}`} className="hover:text-brand-400">@{post.author.username}</Link>
          <FollowCreatorActions username={post.author.username} userId={post.author.id} />
          {post.solved && <span className="text-green-400">Solved</span>}
          {user?.isAdmin && (
            <button type="button" onClick={handleAdminDeletePost} className="text-red-400 hover:underline">
              Delete post (admin)
            </button>
          )}
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <PulseStrip
            pulse={post.pulseScore ?? 0}
            views={post.viewCount ?? 0}
            rep={
              post.upvotes != null && post.downvotes != null ? post.upvotes - post.downvotes : post.upvotes ?? 0
            }
            repLabel="net++"
          />
          {user ? (
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="text-slate-500">signal:</span>
              <button
                type="button"
                disabled={voteBusy}
                onClick={() => handleVote(true)}
                className={`rounded border px-2 py-1 transition ${
                  post.viewerVote === 'up'
                    ? 'border-emerald-500/60 bg-emerald-500/20 text-emerald-300'
                    : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-emerald-500/40 hover:text-emerald-400'
                }`}
              >
                ++
              </button>
              <button
                type="button"
                disabled={voteBusy}
                onClick={() => handleVote(false)}
                className={`rounded border px-2 py-1 transition ${
                  post.viewerVote === 'down'
                    ? 'border-rose-500/60 bg-rose-500/20 text-rose-300'
                    : 'border-slate-600 bg-slate-900 text-slate-400 hover:border-rose-500/40 hover:text-rose-400'
                }`}
              >
                --
              </button>
              <span className="text-slate-600">
                [{post.upvotes ?? 0}↑ {post.downvotes ?? 0}↓]
              </span>
            </div>
          ) : (
            <p className="font-mono text-xs text-slate-500">
              [{post.upvotes ?? 0}↑ {post.downvotes ?? 0}↓] · <Link to="/login" className="text-brand-400 hover:underline">login</Link> to vote
            </p>
          )}
        </div>
        <p className="mt-6 whitespace-pre-wrap text-slate-300">{post.body}</p>
        {post.project && (
          <div className="mt-6 rounded-lg border border-slate-600/80 bg-surface-900/50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Playground project</p>
            <Link to={`/projects/${post.project.id}`} className="mt-1 inline-block font-mono text-sm text-brand-400 hover:underline">
              {post.project.title}
              {post.project.githubFullName ? ` · ${post.project.githubFullName}` : ''} →
            </Link>
          </div>
        )}
        {post.repoPublic && post.repoUrl && post.repoFullName && (
          <div className="mt-6 rounded-lg border border-brand-500/30 bg-brand-500/5 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-brand-400">Public repository</p>
            <a href={post.repoUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block font-mono text-sm text-brand-300 hover:underline">
              {post.repoFullName} →
            </a>
            {post.repoDescription && <p className="mt-2 text-sm text-slate-400">{post.repoDescription}</p>}
          </div>
        )}
      </div>
      <div className="mt-8">
        <h2 className="font-mono text-lg font-medium text-slate-200">Comments ({post.comments?.length ?? 0})</h2>
        {user ? (
          <form onSubmit={handleSubmitComment} className="mt-4">
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" className="input min-h-[100px] resize-y" required />
            <button type="submit" className="btn-primary mt-3" disabled={submitting || !comment.trim()}>{submitting ? 'Posting…' : 'Post comment'}</button>
          </form>
        ) : (
          <p className="mt-4 text-sm text-slate-500"><Link to="/login" className="text-brand-400 hover:underline">Log in</Link> to comment.</p>
        )}
        <ul className="mt-6 space-y-4">
          {(post.comments ?? []).map((c) => (
            <li key={c.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/profile/${c.author.username}`} className="font-medium text-slate-200 hover:text-brand-400">@{c.author.username}</Link>
                {c.isSolution && <span className="rounded bg-green-500/20 px-2 py-0.5 text-xs text-green-400">Solution</span>}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-slate-300">{c.body}</p>
              <p className="mt-2 text-xs text-slate-500">{new Date(c.createdAt).toLocaleDateString()}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
